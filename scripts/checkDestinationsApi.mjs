// Exercises the destinations CRUD API against a running dev server.
//
// Creates a clearly-marked test destination, edits it, then deletes it, so the
// ten real destinations are never touched. If the script fails partway the
// leftover is named "ZZ Test Destination" and is easy to spot and remove.
//
//   node scripts/checkDestinationsApi.mjs [baseUrl]

import nextEnv from "@next/env";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

const { loadEnvConfig } = nextEnv;
loadEnvConfig(process.cwd(), true, { info() {}, error() {} });

const BASE = process.argv[2] ?? "http://localhost:3000";
const TEST_NAME = "ZZ Test Destination";
const RENAMED = "ZZ Test Destination Renamed";

const VALID_IMAGE =
  "https://images.unsplash.com/photo-1593693411515-c20261bcad6e?auto=format&fit=crop&w=1200&q=70";

function normalisePrivateKey(value) {
  let key = value.trim().replace(/,\s*$/, "");
  const wrapped =
    (key.startsWith('"') && key.endsWith('"')) ||
    (key.startsWith("'") && key.endsWith("'"));
  if (wrapped) key = key.slice(1, -1);
  return key.replace(/\\+n/g, "\n");
}

async function mintIdToken() {
  const name = "script-destinations";
  const app =
    getApps().find((a) => a.name === name) ??
    initializeApp(
      {
        credential: cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: normalisePrivateKey(process.env.FIREBASE_PRIVATE_KEY),
        }),
      },
      name
    );

  const auth = getAuth(app);
  const list = await auth.listUsers(5);
  const user = list.users.find((u) => u.email === "admin@gmail.com") ?? list.users[0];
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
const authed = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };

let failures = 0;
function report(label, pass, detail = "") {
  if (!pass) failures += 1;
  console.log(`  ${pass ? "PASS" : "FAIL"}  ${label.padEnd(50)} ${detail}`);
}

async function json(path, options = {}) {
  const response = await fetch(`${BASE}${path}`, options);
  const body = await response.json().catch(() => null);
  return { status: response.status, body };
}

const validPayload = {
  name: TEST_NAME,
  country: "Testland",
  image: VALID_IMAGE,
  imageAlt: "A placeholder image used only by the API test script",
  description:
    "A temporary destination created by the test script to exercise create, update and delete. It is removed at the end of the run.",
  price: 54321,
  category: "india",
};

console.log("=== 1. reads are public, writes are not ===");
{
  const publicRead = await json("/api/destinations");
  report("GET without a token succeeds", publicRead.status === 200, `HTTP ${publicRead.status}, ${publicRead.body?.destinations?.length} rows`);

  const create = await json("/api/destinations", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(validPayload),
  });
  report("POST without a token is refused", create.status === 401, `HTTP ${create.status}`);

  const patch = await json("/api/destinations/507f1f77bcf86cd799439011", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ price: 1 }),
  });
  report("PATCH without a token is refused", patch.status === 401, `HTTP ${patch.status}`);

  const del = await json("/api/destinations/507f1f77bcf86cd799439011", { method: "DELETE" });
  report("DELETE without a token is refused", del.status === 401, `HTTP ${del.status}`);

  const forged = await json("/api/destinations", {
    method: "POST",
    headers: { Authorization: "Bearer forged.token", "Content-Type": "application/json" },
    body: JSON.stringify(validPayload),
  });
  report("POST with a forged token is refused", forged.status === 401, `HTTP ${forged.status}`);
}

console.log("\n=== 2. server-side validation on create ===");
{
  const cases = [
    ["empty body", {}, ["name", "country", "image", "imageAlt", "description", "price", "category"]],
    ["name too short", { ...validPayload, name: "A" }, ["name"]],
    ["image on a disallowed host", { ...validPayload, image: "https://evil.example.com/a.jpg" }, ["image"]],
    ["image not https", { ...validPayload, image: "http://images.unsplash.com/a.jpg" }, ["image"]],
    ["image not a URL at all", { ...validPayload, image: "just some text" }, ["image"]],
    ["missing alt text", { ...validPayload, imageAlt: "" }, ["imageAlt"]],
    ["description too short", { ...validPayload, description: "Too short" }, ["description"]],
    ["price zero", { ...validPayload, price: 0 }, ["price"]],
    ["price negative", { ...validPayload, price: -500 }, ["price"]],
    ["price not a number", { ...validPayload, price: "expensive" }, ["price"]],
    ["price fractional", { ...validPayload, price: 12.5 }, ["price"]],
    ["unknown category", { ...validPayload, category: "space" }, ["category"]],
  ];

  for (const [label, payload, expectedFields] of cases) {
    const result = await json("/api/destinations", {
      method: "POST",
      headers: authed,
      body: JSON.stringify(payload),
    });
    const returned = Object.keys(result.body?.errors ?? {});
    const covers = expectedFields.every((f) => returned.includes(f));
    report(`rejects ${label}`, result.status === 400 && covers, `HTTP ${result.status}, errors: ${returned.join(",") || "none"}`);
  }
}

console.log("\n=== 3. create ===");
let createdId = null;
{
  const created = await json("/api/destinations", {
    method: "POST",
    headers: authed,
    body: JSON.stringify({ ...validPayload, sneakyExtraField: "should be dropped" }),
  });

  report("creates with 201", created.status === 201, `HTTP ${created.status}`);
  createdId = created.body?.destination?.id ?? null;
  report("returns an id", typeof createdId === "string", createdId ?? "none");
  report("extra fields are dropped", !("sneakyExtraField" in (created.body?.destination ?? {})));
  report("no mongo _id leaked", !("_id" in (created.body?.destination ?? {})));

  const duplicate = await json("/api/destinations", {
    method: "POST",
    headers: authed,
    body: JSON.stringify(validPayload),
  });
  report("duplicate name gives 409", duplicate.status === 409, `HTTP ${duplicate.status}`);

  const listed = await json("/api/destinations");
  const found = listed.body?.destinations?.find((d) => d.id === createdId);
  report("appears in the public list", Boolean(found), found ? `price ${found.price}` : "not found");
}

console.log("\n=== 4. update ===");
if (!createdId) {
  console.log("  (skipped - nothing was created)");
} else {
  const badId = await json("/api/destinations/not-an-id", {
    method: "PATCH",
    headers: authed,
    body: JSON.stringify({ price: 1000 }),
  });
  report("rejects a malformed id", badId.status === 400, `HTTP ${badId.status}`);

  const missing = await json("/api/destinations/507f1f77bcf86cd799439011", {
    method: "PATCH",
    headers: authed,
    body: JSON.stringify({ price: 1000 }),
  });
  report("404 for an id that does not exist", missing.status === 404, `HTTP ${missing.status}`);

  // A partial update must keep the rest of the document intact.
  const partial = await json(`/api/destinations/${createdId}`, {
    method: "PATCH",
    headers: authed,
    body: JSON.stringify({ price: 99999 }),
  });
  report("partial update succeeds", partial.status === 200, `HTTP ${partial.status}`);
  report("price changed", partial.body?.destination?.price === 99999, `price=${partial.body?.destination?.price}`);
  report("name untouched by a price-only patch", partial.body?.destination?.name === TEST_NAME, `name=${partial.body?.destination?.name}`);
  report("description untouched", partial.body?.destination?.description === validPayload.description);

  // A partial update that would make the whole document invalid must fail.
  const invalidPartial = await json(`/api/destinations/${createdId}`, {
    method: "PATCH",
    headers: authed,
    body: JSON.stringify({ price: -1 }),
  });
  report("partial update validating the merged result", invalidPartial.status === 400, `HTTP ${invalidPartial.status}`);

  const renamed = await json(`/api/destinations/${createdId}`, {
    method: "PATCH",
    headers: authed,
    body: JSON.stringify({ name: RENAMED }),
  });
  report("rename succeeds", renamed.status === 200 && renamed.body?.destination?.name === RENAMED, `name=${renamed.body?.destination?.name}`);

  // Renaming onto an existing name must conflict.
  const clash = await json(`/api/destinations/${createdId}`, {
    method: "PATCH",
    headers: authed,
    body: JSON.stringify({ name: "Kerala" }),
  });
  report("rename onto an existing name gives 409", clash.status === 409, `HTTP ${clash.status}`);
}

console.log("\n=== 5. delete ===");
if (!createdId) {
  console.log("  (skipped - nothing was created)");
} else {
  const deleted = await json(`/api/destinations/${createdId}`, {
    method: "DELETE",
    headers: authed,
  });
  report("deletes with 200", deleted.status === 200, `HTTP ${deleted.status}`);

  const again = await json(`/api/destinations/${createdId}`, {
    method: "DELETE",
    headers: authed,
  });
  report("deleting twice gives 404", again.status === 404, `HTTP ${again.status}`);

  const listed = await json("/api/destinations");
  const stillThere = listed.body?.destinations?.some((d) => d.id === createdId);
  report("gone from the public list", !stillThere, `${listed.body?.destinations?.length} rows remain`);
  report("the ten real destinations survive", listed.body?.destinations?.length === 10, `${listed.body?.destinations?.length} rows`);
}

console.log(`\n${failures === 0 ? "All checks passed." : `${failures} check(s) FAILED.`}`);
process.exit(failures === 0 ? 0 : 1);
