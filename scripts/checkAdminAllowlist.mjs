// Tests the ADMIN_EMAILS allowlist against a deployment.
//
// Complements checkSelfSignup.mjs. That one asks "can a stranger register?" -
// which Firebase can refuse on its own once self-registration is turned off.
// This one asks the question that matters if that setting is ever changed
// back: given a genuine, fully authenticated account that is NOT on the
// allowlist, does the admin API refuse it?
//
// The throwaway account is created through the Admin SDK, which is not subject
// to the sign-up restriction, and deleted at the end.
//
//   node scripts/checkAdminAllowlist.mjs [baseUrl]

import nextEnv from "@next/env";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

const { loadEnvConfig } = nextEnv;
loadEnvConfig(process.cwd(), true, { info() {}, error() {} });

const BASE = process.argv[2] ?? "http://localhost:3000";
const API_KEY = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;

const outsiderEmail = `zz-outsider-${Date.now()}@example.com`;

function normalisePrivateKey(value) {
  let key = value.trim().replace(/,\s*$/, "");
  const wrapped =
    (key.startsWith('"') && key.endsWith('"')) ||
    (key.startsWith("'") && key.endsWith("'"));
  if (wrapped) key = key.slice(1, -1);
  return key.replace(/\\+n/g, "\n");
}

function adminAuth() {
  const name = "script-allowlist";
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

async function idTokenFor(uid) {
  const customToken = await adminAuth().createCustomToken(uid);
  const response = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: customToken, returnSecureToken: true }),
    }
  );
  const data = await response.json();
  if (!data.idToken) throw new Error(`token exchange failed: ${data?.error?.message}`);
  return data.idToken;
}

const ROUTES = [
  ["GET", "/api/admin/me"],
  ["GET", "/api/enquiries"],
  ["GET", "/api/analytics/summary"],
];

async function tryRoutes(label, token) {
  const results = [];
  for (const [method, path] of ROUTES) {
    const response = await fetch(`${BASE}${path}`, {
      method,
      headers: { Authorization: `Bearer ${token}` },
    });
    const body = await response.json().catch(() => null);
    results.push({ path, status: response.status, code: body?.code ?? null });
    console.log(
      `  ${label.padEnd(22)} ${method} ${path.padEnd(26)} HTTP ${response.status}  ${body?.code ?? ""}`
    );
  }
  return results;
}

console.log(`target: ${BASE}\n`);

let failures = 0;
const auth = adminAuth();

// --- the genuine admin must still get in -------------------------------------
console.log("=== the allowlisted admin ===");
const list = await auth.listUsers(20);
const admin = list.users.find((u) => u.email === "admin@gmail.com");

if (!admin) {
  console.log("  admin@gmail.com not found - cannot test the accept path");
  failures += 1;
} else {
  const adminResults = await tryRoutes("admin@gmail.com", await idTokenFor(admin.uid));
  if (!adminResults.every((r) => r.status === 200)) {
    console.log("  FAIL: the real admin was refused");
    failures += 1;
  } else {
    console.log("  PASS: all admin routes accepted the allowlisted account");
  }
}

// --- a real account that is not on the list must be refused ------------------
console.log("\n=== a fully authenticated account that is NOT allowlisted ===");
let outsider = null;
try {
  outsider = await auth.createUser({
    email: outsiderEmail,
    password: `Zz!${Date.now()}xY`,
  });
  console.log(`  created ${outsiderEmail} via the Admin SDK`);

  const outsiderResults = await tryRoutes("outsider", await idTokenFor(outsider.uid));

  const allForbidden = outsiderResults.every((r) => r.status === 403);
  if (allForbidden) {
    console.log("  PASS: every route returned 403 not_an_admin");
  } else {
    console.log("  FAIL: an unlisted account reached an admin route");
    failures += 1;
  }
} catch (error) {
  console.log(`  could not run this check: ${error.message}`);
  failures += 1;
} finally {
  if (outsider) {
    try {
      await auth.deleteUser(outsider.uid);
      console.log(`  deleted ${outsiderEmail}`);
    } catch (error) {
      console.log(`  COULD NOT DELETE ${outsiderEmail}: ${error.message}`);
      console.log("  Remove it in Firebase Console -> Authentication -> Users");
      failures += 1;
    }
  }
}

console.log(`\n${failures === 0 ? "Allowlist works: identity is not authorisation." : `${failures} check(s) FAILED.`}`);
process.exit(failures === 0 ? 0 : 1);
