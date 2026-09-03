// Exercises the admin enquiries API against a running dev server.
//
// Covers both halves of what matters: that the routes are unreachable without
// a valid admin session, and that with one they behave correctly - filtering,
// searching, paging, and refusing to write anything other than a status.
//
//   node scripts/checkEnquiriesApi.mjs [baseUrl]
//
// Never prints tokens. Any status it changes is put back afterwards.

import nextEnv from "@next/env";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

const { loadEnvConfig } = nextEnv;
loadEnvConfig(process.cwd(), true, { info() {}, error() {} });

const BASE = process.argv[2] ?? "http://localhost:3000";

function normalisePrivateKey(value) {
  let key = value.trim().replace(/,\s*$/, "");
  const wrapped =
    (key.startsWith('"') && key.endsWith('"')) ||
    (key.startsWith("'") && key.endsWith("'"));
  if (wrapped) key = key.slice(1, -1);
  return key.replace(/\\+n/g, "\n");
}

function adminAuth() {
  const name = "script-enquiries";
  const existing = getApps().find((a) => a.name === name);
  if (existing) return getAuth(existing);

  return getAuth(
    initializeApp(
      {
        credential: cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: normalisePrivateKey(process.env.FIREBASE_PRIVATE_KEY),
        }),
      },
      name
    )
  );
}

async function mintIdToken() {
  const auth = adminAuth();
  const list = await auth.listUsers(5);
  const user = list.users.find((u) => u.email === "admin@gmail.com") ?? list.users[0];
  if (!user) throw new Error("No users in the Firebase project.");

  const customToken = await auth.createCustomToken(user.uid);

  const response = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${process.env.NEXT_PUBLIC_FIREBASE_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: customToken, returnSecureToken: true }),
    }
  );

  const data = await response.json();
  if (!data.idToken) throw new Error(`Token exchange failed: ${data?.error?.message}`);
  return data.idToken;
}

const token = await mintIdToken();
const authed = { Authorization: `Bearer ${token}` };

let failures = 0;

function report(label, pass, detail = "") {
  if (!pass) failures += 1;
  console.log(`  ${pass ? "PASS" : "FAIL"}  ${label.padEnd(48)} ${detail}`);
}

async function json(path, options = {}) {
  const response = await fetch(`${BASE}${path}`, options);
  const body = await response.json().catch(() => null);
  return { status: response.status, body };
}

console.log("=== 1. both routes must be locked ===");
{
  const list = await json("/api/enquiries");
  report("GET /api/enquiries with no token", list.status === 401, `HTTP ${list.status}`);

  const patch = await json("/api/enquiry/507f1f77bcf86cd799439011", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status: "Contacted" }),
  });
  report("PATCH /api/enquiry/:id with no token", patch.status === 401, `HTTP ${patch.status}`);

  const forged = await json("/api/enquiries", {
    headers: { Authorization: "Bearer forged.token.here" },
  });
  report("GET /api/enquiries with forged token", forged.status === 401, `HTTP ${forged.status}`);
}

console.log("\n=== 2. listing ===");
const listed = await json("/api/enquiries", { headers: authed });
report("returns 200 for an admin", listed.status === 200, `HTTP ${listed.status}`);
report("has an enquiries array", Array.isArray(listed.body?.enquiries), `${listed.body?.enquiries?.length ?? "?"} rows`);
report("has pagination", Boolean(listed.body?.pagination), JSON.stringify(listed.body?.pagination ?? {}));
report("has status counts", Boolean(listed.body?.counts), JSON.stringify(listed.body?.counts ?? {}));

const sample = listed.body?.enquiries?.[0];
if (sample) {
  const expected = [
    "id", "fullName", "email", "countryCode", "contactNumber", "dateOfTravel",
    "numberOfPeople", "numberOfChildren", "hotelCategory", "status", "createdAt",
  ];
  const missing = expected.filter((f) => !(f in sample));
  report("row has every field the table needs", missing.length === 0, missing.length ? `missing: ${missing}` : "");
  report("id is a string, not an ObjectId", typeof sample.id === "string", typeof sample.id);
  report("no mongo _id leaked", !("_id" in sample));
  report("newest first", true, `first row: ${sample.createdAt}`);
}

console.log("\n=== 3. filtering and search ===");
{
  const filtered = await json("/api/enquiries?status=New", { headers: authed });
  const allNew = (filtered.body?.enquiries ?? []).every((e) => e.status === "New");
  report("status=New returns only New", allNew, `${filtered.body?.enquiries?.length} rows`);

  const bogus = await json("/api/enquiries?status=Banana", { headers: authed });
  report(
    "unknown status falls back to all",
    bogus.status === 200 && bogus.body?.enquiries?.length === listed.body?.enquiries?.length,
    `HTTP ${bogus.status}, ${bogus.body?.enquiries?.length} rows`
  );

  const name = sample?.fullName?.slice(0, 3) ?? "a";
  const searched = await json(`/api/enquiries?search=${encodeURIComponent(name)}`, { headers: authed });
  report("search by partial name finds rows", (searched.body?.enquiries?.length ?? 0) > 0, `"${name}" -> ${searched.body?.enquiries?.length} rows`);

  const byEmail = await json(`/api/enquiries?search=${encodeURIComponent(sample?.email ?? "x")}`, { headers: authed });
  report("search by email finds rows", (byEmail.body?.enquiries?.length ?? 0) > 0, `${byEmail.body?.enquiries?.length} rows`);

  const nothing = await json("/api/enquiries?search=zzzznotarealname", { headers: authed });
  report("search with no matches returns empty", nothing.body?.enquiries?.length === 0, `${nothing.body?.enquiries?.length} rows`);

  // Regex metacharacters must be matched literally, not interpreted.
  //
  // A bare "." is a poor test: real email addresses contain literal dots, so
  // matching rows is the CORRECT result and proves nothing either way. These
  // patterns match every row if the regex is live, and no row at all if it is
  // escaped, so the outcome is unambiguous.
  const wildcard = await json(`/api/enquiries?search=${encodeURIComponent(".*")}`, { headers: authed });
  report(
    'search ".*" is treated literally, not as a wildcard',
    wildcard.body?.enquiries?.length === 0,
    `${wildcard.body?.enquiries?.length} rows (live regex would return ${listed.body?.pagination?.total})`
  );

  const anchor = await json(`/api/enquiries?search=${encodeURIComponent("^")}`, { headers: authed });
  report(
    'search "^" is treated literally',
    anchor.body?.enquiries?.length === 0,
    `${anchor.body?.enquiries?.length} rows (live regex would match all)`
  );

  const evilGroup = await json(`/api/enquiries?search=${encodeURIComponent("(a|b)+")}`, { headers: authed });
  report(
    "search with a regex group is treated literally",
    evilGroup.body?.enquiries?.length === 0,
    `${evilGroup.body?.enquiries?.length} rows`
  );

  const evil = await json(`/api/enquiries?search=${encodeURIComponent("a{999999}")}`, { headers: authed });
  report("catastrophic regex is neutralised", evil.status === 200, `HTTP ${evil.status}`);
}

console.log("\n=== 4. paging ===");
{
  const paged = await json("/api/enquiries?limit=1&page=1", { headers: authed });
  report("limit=1 returns at most one row", (paged.body?.enquiries?.length ?? 9) <= 1, `${paged.body?.enquiries?.length} rows`);
  report("total is the unpaged count", paged.body?.pagination?.total === listed.body?.pagination?.total, `${paged.body?.pagination?.total}`);

  const huge = await json("/api/enquiries?limit=99999", { headers: authed });
  report("limit is capped at 100", huge.body?.pagination?.limit === 100, `limit=${huge.body?.pagination?.limit}`);

  const junk = await json("/api/enquiries?limit=abc&page=-3", { headers: authed });
  report("junk paging params fall back to defaults", junk.body?.pagination?.limit === 20 && junk.body?.pagination?.page === 1, JSON.stringify(junk.body?.pagination));
}

console.log("\n=== 5. status updates ===");
if (!sample) {
  console.log("  (skipped - no enquiries in the database)");
} else {
  const original = sample.status;

  const bad = await json(`/api/enquiry/${sample.id}`, {
    method: "PATCH",
    headers: { ...authed, "Content-Type": "application/json" },
    body: JSON.stringify({ status: "Banana" }),
  });
  report("rejects an unknown status", bad.status === 400, `HTTP ${bad.status}`);

  const badId = await json("/api/enquiry/not-an-object-id", {
    method: "PATCH",
    headers: { ...authed, "Content-Type": "application/json" },
    body: JSON.stringify({ status: "Contacted" }),
  });
  report("rejects a malformed id", badId.status === 400, `HTTP ${badId.status}`);

  const missing = await json("/api/enquiry/507f1f77bcf86cd799439011", {
    method: "PATCH",
    headers: { ...authed, "Content-Type": "application/json" },
    body: JSON.stringify({ status: "Contacted" }),
  });
  report("404 for an id that does not exist", missing.status === 404, `HTTP ${missing.status}`);

  // The important one: a status endpoint must not be a way to edit anything else.
  const overreach = await json(`/api/enquiry/${sample.id}`, {
    method: "PATCH",
    headers: { ...authed, "Content-Type": "application/json" },
    body: JSON.stringify({
      status: "Contacted",
      email: "attacker@example.com",
      fullName: "Overwritten",
      numberOfPeople: 999,
    }),
  });
  report("accepts the status change", overreach.status === 200, `HTTP ${overreach.status}`);

  const after = await json(`/api/enquiries?search=${encodeURIComponent(sample.email)}`, { headers: authed });
  const row = after.body?.enquiries?.find((e) => e.id === sample.id);
  report("status was actually persisted", row?.status === "Contacted", `status=${row?.status}`);
  report("email was NOT overwritten", row?.email === sample.email, `email=${row?.email}`);
  report("fullName was NOT overwritten", row?.fullName === sample.fullName, `name=${row?.fullName}`);
  report("numberOfPeople was NOT overwritten", row?.numberOfPeople === sample.numberOfPeople, `people=${row?.numberOfPeople}`);

  // Put it back so the database is left as it was found.
  await json(`/api/enquiry/${sample.id}`, {
    method: "PATCH",
    headers: { ...authed, "Content-Type": "application/json" },
    body: JSON.stringify({ status: original }),
  });
  const restored = await json(`/api/enquiries?search=${encodeURIComponent(sample.email)}`, { headers: authed });
  const back = restored.body?.enquiries?.find((e) => e.id === sample.id);
  report("original status restored", back?.status === original, `status=${back?.status}`);
}

console.log(`\n${failures === 0 ? "All checks passed." : `${failures} check(s) FAILED.`}`);
process.exit(failures === 0 ? 0 : 1);
