// Verifies that the Firebase Admin credentials in .env.local actually work,
// by initialising the SDK and making a real call to Google.
//
// Worth doing before anything is built on top: a bad service account fails
// with errors that point at the wrong thing, and a login page that cannot
// verify tokens looks like a bug in the page rather than in the credentials.
//
// It also lists the admin users, so we can confirm the evaluator's test
// account exists.
//
//   node scripts/checkFirebaseAdmin.mjs
//
// Prints emails and UIDs, never the private key.

import fs from "node:fs";
// firebase-admin v14 exposes its API through subpath modules. The older
// `import admin from "firebase-admin"` default export does not carry
// `admin.credential`, so cert() has to come from firebase-admin/app.
import { cert, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

function readEnv(key) {
  const text = fs.readFileSync(".env.local", "utf8");
  const marker = `${key}=`;
  const at = text.indexOf(marker);
  if (at === -1) return null;

  const rest = text.slice(at + marker.length);
  if (rest[0] === '"' || rest[0] === "'") {
    const quote = rest[0];
    const close = rest.indexOf(quote, 1);
    return close === -1 ? rest.slice(1) : rest.slice(1, close);
  }
  return rest.split(/\r?\n/)[0].trim();
}

const projectId = readEnv("FIREBASE_PROJECT_ID");
const clientEmail = readEnv("FIREBASE_CLIENT_EMAIL");
const privateKey = readEnv("FIREBASE_PRIVATE_KEY")?.replace(/\\+n/g, "\n");

if (!projectId || !clientEmail || !privateKey) {
  console.error("One or more FIREBASE_* variables are missing from .env.local.");
  process.exit(1);
}

console.log("project      :", projectId);
console.log("service acct :", clientEmail);
console.log();

try {
  initializeApp({
    credential: cert({ projectId, clientEmail, privateKey }),
  });
  console.log("Admin SDK initialised.");
} catch (error) {
  console.error("Could not initialise the Admin SDK:", error.message);
  process.exit(1);
}

try {
  // Any real API call proves the credentials are accepted by Google. Listing
  // users also tells us whether the test admin account exists.
  const result = await getAuth().listUsers(20);

  console.log("Credentials accepted by Google.\n");
  console.log(`users in this project: ${result.users.length}`);

  if (result.users.length === 0) {
    console.log("\nNo users yet. The evaluator needs a working login, so create one in");
    console.log("Firebase Console -> Authentication -> Users -> Add user.");
  }

  for (const user of result.users) {
    const providers = user.providerData.map((p) => p.providerId).join(", ") || "none";
    console.log(
      `  ${(user.email ?? "(no email)").padEnd(30)} uid=${user.uid.slice(0, 10)}...  providers: ${providers}  disabled: ${user.disabled}`
    );
  }

  const target = result.users.find((u) => u.email === "admin@gmail.com");
  console.log(
    "\nassignment test account (admin@gmail.com):",
    target ? "EXISTS" : "not found"
  );

  // Email/Password must be enabled for the login page to work at all.
  const hasPassword = result.users.some((u) =>
    u.providerData.some((p) => p.providerId === "password")
  );
  console.log(
    "at least one email/password user:",
    hasPassword ? "yes" : "no - enable Email/Password sign-in and add a user"
  );
} catch (error) {
  console.error("\nGoogle rejected the credentials.");
  console.error("code   :", error.code ?? "(none)");
  console.error("message:", String(error.message).slice(0, 200));
  process.exit(1);
}

process.exit(0);
