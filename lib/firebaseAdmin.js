// Firebase Admin SDK setup.
//
// SERVER ONLY. This reads FIREBASE_PRIVATE_KEY, which grants full admin access
// to the Firebase project, so it must never be imported by a "use client"
// component or by anything a client component imports.
//
// The Admin SDK is what makes admin API routes genuinely protected: it checks
// that an ID token was really signed by Google for our project. The client SDK
// cannot do this - anything running in the browser can be edited by whoever is
// using it.
//
// Note this uses the firebase-admin/app and firebase-admin/auth subpaths.
// firebase-admin v14 does not expose `credential` on the old default export,
// so `admin.credential.cert(...)` fails with "Cannot read properties of
// undefined (reading 'cert')".

import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

// Named so it cannot collide with any default app, and so the lookup below is
// unambiguous.
const ADMIN_APP_NAME = "travel-unbounded-admin";

// Cleans up the private key as it arrives from the environment.
//
// This is deliberately forgiving, because the key is copied by hand out of a
// JSON file and every way of getting it slightly wrong produces the same
// useless error: "DECODER routines::unsupported", or Firebase's equally
// unhelpful "Failed to parse private key". The value also has to survive
// being pasted into a hosting dashboard, where quoting rules differ again.
//
// Three things are handled:
//
//   1. A trailing comma, left behind when the line is copied straight out of
//      the JSON. This one is nastier than it looks: the comma sits after the
//      closing quote, which stops the env loader recognising the value as
//      quoted, so the quotes themselves end up inside the string.
//   2. Wrapping quotes that the env loader therefore did not strip.
//   3. "\n" escape sequences, which must become real newlines - an env file
//      cannot hold a literal newline. One or more backslashes are allowed, so
//      a value escaped twice ("\\n") works too.
//
// scripts/checkFirebaseKey.mjs reports on all of this without printing the key.
function normalisePrivateKey(value) {
  let key = value.trim();

  // Order matters: the comma has to go before the quotes can be recognised as
  // wrapping the whole value.
  key = key.replace(/,\s*$/, "");

  const isWrapped =
    (key.startsWith('"') && key.endsWith('"')) ||
    (key.startsWith("'") && key.endsWith("'"));

  if (isWrapped) key = key.slice(1, -1);

  return key.replace(/\\+n/g, "\n");
}

function readCredentials() {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const rawPrivateKey = process.env.FIREBASE_PRIVATE_KEY;

  // Checked here rather than at import time so a missing variable surfaces as
  // a handled 500 from an API route instead of crashing the build. Same
  // reasoning as the MONGODB_URI check in lib/mongodb.js.
  const missing = [
    !projectId && "FIREBASE_PROJECT_ID",
    !clientEmail && "FIREBASE_CLIENT_EMAIL",
    !rawPrivateKey && "FIREBASE_PRIVATE_KEY",
  ].filter(Boolean);

  if (missing.length > 0) {
    throw new Error(
      `Firebase Admin is not configured. Missing from the environment: ${missing.join(", ")}.`
    );
  }

  return {
    projectId,
    clientEmail,
    privateKey: normalisePrivateKey(rawPrivateKey),
  };
}

// Initialising the same app twice throws, and in development Next.js reloads
// modules on every save, so an existing app is reused when there is one.
function getAdminApp() {
  const existing = getApps().find((app) => app.name === ADMIN_APP_NAME);
  if (existing) return existing;

  return initializeApp({ credential: cert(readCredentials()) }, ADMIN_APP_NAME);
}

export function getAdminAuth() {
  return getAuth(getAdminApp());
}
