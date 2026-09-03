// Security check: can a stranger create their own account and become an admin?
//
// The Firebase Web API key is public by design - it ships in the browser
// bundle and cannot be hidden. That is fine on its own. It stops being fine if
// BOTH of these are true:
//
//   1. Email/Password sign-UP is open on the project, so anyone holding the
//      public key can create an account through the REST API, and
//   2. our own requireAdmin() treats any authenticated user as an admin.
//
// Together those would mean the dashboard is open to anyone who reads the key
// out of the page source. This script finds out, by attempting a sign-up with
// nothing but the public key - exactly what an attacker has.
//
// Any account it creates is deleted again immediately.
//
//   node scripts/checkSelfSignup.mjs [baseUrl]

import nextEnv from "@next/env";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

const { loadEnvConfig } = nextEnv;
loadEnvConfig(process.cwd(), true, { info() {}, error() {} });

const BASE = process.argv[2] ?? "http://localhost:3000";
const PUBLIC_KEY = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;

const intruderEmail = `zz-intruder-${Date.now()}@example.com`;
const intruderPassword = `Zz!${Date.now()}aB`;

function normalisePrivateKey(value) {
  let key = value.trim().replace(/,\s*$/, "");
  const wrapped =
    (key.startsWith('"') && key.endsWith('"')) ||
    (key.startsWith("'") && key.endsWith("'"));
  if (wrapped) key = key.slice(1, -1);
  return key.replace(/\\+n/g, "\n");
}

function adminAuth() {
  const name = "script-signup";
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

console.log(`target        : ${BASE}`);
console.log(`public api key: ${PUBLIC_KEY ? "present (as it is in any browser)" : "MISSING"}`);
console.log();

// Step 1: attempt a sign-up with only the public key.
console.log("=== 1. can a stranger create an account with just the public key? ===");

const signUp = await fetch(
  `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${PUBLIC_KEY}`,
  {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: intruderEmail,
      password: intruderPassword,
      returnSecureToken: true,
    }),
  }
);

const signUpBody = await signUp.json();

if (!signUp.ok || !signUpBody.idToken) {
  console.log(`  BLOCKED - sign-up refused: ${signUpBody?.error?.message ?? signUp.status}`);
  console.log("\n  Self-registration is not possible, so a public API key cannot");
  console.log("  be turned into an admin session.");
  process.exit(0);
}

console.log(`  SUCCEEDED - created ${intruderEmail} with no credentials of any kind`);

// Step 2: the part that decides whether it matters. Does OUR api accept it?
console.log("\n=== 2. does our admin API accept that self-made account? ===");

const probe = await fetch(`${BASE}/api/admin/me`, {
  headers: { Authorization: `Bearer ${signUpBody.idToken}` },
});
const probeBody = await probe.json().catch(() => null);

console.log(`  GET /api/admin/me -> HTTP ${probe.status}`);
console.log(`  body: ${JSON.stringify(probeBody)}`);

const enquiries = await fetch(`${BASE}/api/enquiries`, {
  headers: { Authorization: `Bearer ${signUpBody.idToken}` },
});
const enquiriesBody = await enquiries.json().catch(() => null);
console.log(`  GET /api/enquiries -> HTTP ${enquiries.status}`);
if (enquiries.status === 200) {
  console.log(`  *** READ ${enquiriesBody?.enquiries?.length} CUSTOMER RECORDS ***`);
}

// Step 3: clean up regardless of the outcome.
console.log("\n=== 3. cleanup ===");
try {
  const auth = adminAuth();
  const user = await auth.getUserByEmail(intruderEmail);
  await auth.deleteUser(user.uid);
  console.log(`  deleted ${intruderEmail}`);
} catch (error) {
  console.log(`  could not delete ${intruderEmail}: ${error.message}`);
  console.log("  DELETE IT MANUALLY in Firebase Console -> Authentication -> Users");
}

console.log("\n=== verdict ===");
if (probe.status === 200 || enquiries.status === 200) {
  console.log("  VULNERABLE. Anyone can read the public API key out of the page");
  console.log("  source, register an account, and reach the admin API.");
  process.exit(1);
}

console.log("  Not exploitable: the account was created but our API refused it.");
process.exit(0);
