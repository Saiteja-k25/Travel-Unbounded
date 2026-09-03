// End-to-end check of the admin lock against a running dev server.
//
// Proves both halves:
//   - a genuine Firebase ID token is ACCEPTED
//   - every kind of missing, malformed or forged token is REJECTED with 401
//
// The token is obtained without needing the admin's password: the Admin SDK
// mints a custom token for the user, which is then exchanged for a real ID
// token through the Firebase Auth REST API. That is exactly the token a
// browser would send after signing in.
//
//   node scripts/checkAdminRoute.mjs [baseUrl]
//
// Defaults to http://localhost:3000. Never prints tokens.

import nextEnv from "@next/env";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

const { loadEnvConfig } = nextEnv;
loadEnvConfig(process.cwd(), true, { info() {}, error() {} });

const BASE = process.argv[2] ?? "http://localhost:3000";
const ENDPOINT = `${BASE}/api/admin/me`;

function normalisePrivateKey(value) {
  let key = value.trim().replace(/,\s*$/, "");
  const wrapped =
    (key.startsWith('"') && key.endsWith('"')) ||
    (key.startsWith("'") && key.endsWith("'"));
  if (wrapped) key = key.slice(1, -1);
  return key.replace(/\\+n/g, "\n");
}

function adminAuth() {
  const name = "script-admin";
  const existing = getApps().find((a) => a.name === name);
  if (existing) return getAuth(existing);

  const app = initializeApp(
    {
      credential: cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: normalisePrivateKey(process.env.FIREBASE_PRIVATE_KEY),
      }),
    },
    name
  );

  return getAuth(app);
}

async function call(label, headers) {
  const response = await fetch(ENDPOINT, { headers });
  const body = await response.json().catch(() => null);
  const detail = body?.code ?? body?.user?.email ?? "";
  console.log(
    `  ${label.padEnd(40)} HTTP ${response.status}  ${detail}`
  );
  return response.status;
}

const auth = adminAuth();

// Find the admin user, then mint a real ID token for them.
const list = await auth.listUsers(5);
const user = list.users.find((u) => u.email === "admin@gmail.com") ?? list.users[0];

if (!user) {
  console.error("No users in this Firebase project - cannot test the accept path.");
  process.exit(1);
}

console.log(`testing against : ${ENDPOINT}`);
console.log(`as user         : ${user.email}\n`);

const customToken = await auth.createCustomToken(user.uid);

const exchange = await fetch(
  `https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${process.env.NEXT_PUBLIC_FIREBASE_API_KEY}`,
  {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token: customToken, returnSecureToken: true }),
  }
);

const exchanged = await exchange.json();

if (!exchange.ok || !exchanged.idToken) {
  console.error("Could not exchange the custom token for an ID token.");
  console.error("status:", exchange.status, "error:", exchanged?.error?.message);
  process.exit(1);
}

const idToken = exchanged.idToken;

console.log("=== must be REJECTED ===");
const rejected = [];
rejected.push(await call("no Authorization header", {}));
rejected.push(await call("empty Bearer", { Authorization: "Bearer " }));
rejected.push(await call("garbage token", { Authorization: "Bearer nonsense" }));
rejected.push(await call("Basic auth instead", { Authorization: "Basic YWRtaW46eA==" }));
rejected.push(await call("token with no Bearer prefix", { Authorization: idToken }));
// Tampering, several ways. Only Google can produce a valid signature for our
// project, so every one of these must fail - this is the whole reason for
// verifying server-side rather than trusting the browser.
//
// Note the last base64url character of a signature can carry insignificant
// bits, so changing only that may decode to the very same bytes and is not a
// real test of anything. These change bytes that definitely matter.
const [header, payload, signature] = idToken.split(".");

// A character in the middle of the signature.
const midIndex = Math.floor(signature.length / 2);
const midChar = signature[midIndex] === "A" ? "B" : "A";
const tamperedSignature =
  signature.slice(0, midIndex) + midChar + signature.slice(midIndex + 1);

// A forged payload claiming to be the admin, with the genuine signature
// attached. This is the attack the signature check exists to stop.
const forgedPayload = Buffer.from(
  JSON.stringify({
    ...JSON.parse(Buffer.from(payload, "base64url").toString("utf8")),
    email: "attacker@example.com",
  })
).toString("base64url");

rejected.push(
  await call("signature altered mid-string", {
    Authorization: `Bearer ${header}.${payload}.${tamperedSignature}`,
  })
);
rejected.push(
  await call("signature removed", { Authorization: `Bearer ${header}.${payload}.` })
);
rejected.push(
  await call("payload swapped, real signature", {
    Authorization: `Bearer ${header}.${forgedPayload}.${signature}`,
  })
);
rejected.push(
  await call("alg set to none", {
    Authorization: `Bearer ${Buffer.from(JSON.stringify({ alg: "none", typ: "JWT" })).toString("base64url")}.${payload}.`,
  })
);

console.log("\n=== must be ACCEPTED ===");
const accepted = await call("genuine Firebase ID token", {
  Authorization: `Bearer ${idToken}`,
});

console.log("\n=== result ===");
const allRejected = rejected.every((s) => s === 401);
const okAccepted = accepted === 200;

console.log("  every bad request returned 401 :", allRejected ? "YES" : "NO");
console.log("  genuine token returned 200     :", okAccepted ? "YES" : "NO");

if (allRejected && okAccepted) {
  console.log("\n  The admin lock works.");
  process.exit(0);
}

console.log("\n  Something is wrong - see the rows above.");
process.exit(1);
