// Checks the analytics summary endpoint against a running dev server.
//
// The rubric asks that charts match the underlying data, so the important
// assertions here are the cross-checks: the status breakdown must sum to the
// total, and it must agree with what /api/enquiries reports for the same
// filters. Two places counting the same thing is exactly how a dashboard ends
// up lying.
//
//   node scripts/checkAnalyticsApi.mjs [baseUrl]

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

async function mintIdToken() {
  const name = "script-analytics";
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
const authed = { Authorization: `Bearer ${token}` };

let failures = 0;
function report(label, pass, detail = "") {
  if (!pass) failures += 1;
  console.log(`  ${pass ? "PASS" : "FAIL"}  ${label.padEnd(52)} ${detail}`);
}

async function json(path, options = {}) {
  const response = await fetch(`${BASE}${path}`, options);
  const body = await response.json().catch(() => null);
  return { status: response.status, body };
}

console.log("=== 1. the endpoint is locked ===");
{
  const anon = await json("/api/analytics/summary");
  report("no token is refused", anon.status === 401, `HTTP ${anon.status}`);

  const forged = await json("/api/analytics/summary", {
    headers: { Authorization: "Bearer forged.token.value" },
  });
  report("forged token is refused", forged.status === 401, `HTTP ${forged.status}`);
}

console.log("\n=== 2. shape ===");
const summary = await json("/api/analytics/summary?days=30", { headers: authed });
report("returns 200 for an admin", summary.status === 200, `HTTP ${summary.status}`);

const body = summary.body ?? {};
report("has totals", Boolean(body.totals), JSON.stringify(body.totals ?? {}));
report("has byStatus", Array.isArray(body.byStatus), `${body.byStatus?.length} entries`);
report("has timeline", Array.isArray(body.timeline), `${body.timeline?.length} days`);
report("has byHotelCategory", Array.isArray(body.byHotelCategory));
report("has topDestinations", Array.isArray(body.topDestinations));

console.log("\n=== 3. the charts must match the data ===");
{
  // Every status appears, including those with none, so slices do not appear
  // and disappear between loads.
  const statuses = (body.byStatus ?? []).map((r) => r.status);
  report(
    "all four statuses present even at zero",
    ["New", "Contacted", "Converted", "Closed"].every((s) => statuses.includes(s)),
    statuses.join(",")
  );

  const statusSum = (body.byStatus ?? []).reduce((sum, r) => sum + r.count, 0);
  report(
    "status counts sum to the total",
    statusSum === body.totals?.enquiries,
    `${statusSum} vs total ${body.totals?.enquiries}`
  );

  // The single most important check: analytics and the enquiries table must
  // agree, because they are two separate queries over the same collection.
  const list = await json("/api/enquiries?limit=100", { headers: authed });
  report(
    "total agrees with /api/enquiries",
    body.totals?.enquiries === list.body?.pagination?.total,
    `analytics ${body.totals?.enquiries} vs table ${list.body?.pagination?.total}`
  );

  let perStatusAgrees = true;
  const detail = [];
  for (const row of body.byStatus ?? []) {
    const filtered = await json(`/api/enquiries?status=${row.status}&limit=1`, {
      headers: authed,
    });
    const tableCount = filtered.body?.pagination?.total;
    if (tableCount !== row.count) {
      perStatusAgrees = false;
      detail.push(`${row.status}: chart ${row.count} vs table ${tableCount}`);
    }
  }
  report(
    "every status count agrees with the table",
    perStatusAgrees,
    detail.join("; ") || "all four match"
  );

  const timelineSum = (body.timeline ?? []).reduce((sum, r) => sum + r.count, 0);
  report(
    "timeline sums to the in-range total",
    timelineSum === body.totals?.inRange,
    `${timelineSum} vs inRange ${body.totals?.inRange}`
  );

  const hotelSum = (body.byHotelCategory ?? []).reduce((sum, r) => sum + r.count, 0);
  report(
    "hotel categories sum to the total",
    hotelSum === body.totals?.enquiries,
    `${hotelSum} vs ${body.totals?.enquiries}`
  );

  const converted = (body.byStatus ?? []).find((r) => r.status === "Converted")?.count ?? 0;
  const expectedRate =
    body.totals?.enquiries > 0
      ? Math.round((converted / body.totals.enquiries) * 1000) / 10
      : 0;
  report(
    "conversion rate is computed correctly",
    body.totals?.conversionRate === expectedRate,
    `${body.totals?.conversionRate}% (expected ${expectedRate}%)`
  );
}

console.log("\n=== 4. the timeline has no gaps ===");
{
  const timeline = body.timeline ?? [];
  report("30 days requested gives 30 buckets", timeline.length === 30, `${timeline.length}`);

  // Consecutive days with no missing dates: a line chart would otherwise join
  // two distant points and imply a trickle where there was nothing.
  let consecutive = true;
  for (let i = 1; i < timeline.length; i += 1) {
    const previous = new Date(`${timeline[i - 1].date}T00:00:00`);
    const current = new Date(`${timeline[i].date}T00:00:00`);
    if (Math.round((current - previous) / 86400000) !== 1) consecutive = false;
  }
  report("every day is present and in order", consecutive);
  report(
    "last bucket is today",
    timeline.at(-1)?.date ===
      new Date().toLocaleDateString("en-CA"),
    `${timeline.at(-1)?.date}`
  );
}

console.log("\n=== 5. range parameter ===");
{
  for (const [label, query, expected] of [
    ["days=7", "?days=7", 7],
    ["days=90", "?days=90", 90],
    ["no parameter defaults to 30", "", 30],
    ["days=abc falls back to 30", "?days=abc", 30],
    ["days=0 falls back to 30", "?days=0", 30],
    ["days=99999 is capped at 365", "?days=99999", 365],
    ["days=-5 falls back to 30", "?days=-5", 30],
  ]) {
    const result = await json(`/api/analytics/summary${query}`, { headers: authed });
    report(label, result.body?.timeline?.length === expected, `${result.body?.timeline?.length} buckets`);
  }
}

console.log(`\n${failures === 0 ? "All checks passed." : `${failures} check(s) FAILED.`}`);
process.exit(failures === 0 ? 0 : 1);
