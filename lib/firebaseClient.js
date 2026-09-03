// Firebase client SDK setup, for the browser.
//
// The three NEXT_PUBLIC_ values here are meant to be public: the Firebase
// client SDK is designed to run in untrusted browsers, and these identify the
// project rather than authorise anything. Security comes from Firebase Auth
// and from our own server-side token verification, not from hiding them. That
// is exactly why they carry the NEXT_PUBLIC_ prefix while the service account
// credentials in lib/firebaseAdmin.js must not.
//
// What this file is for: signing the admin in, and handing out the resulting
// ID token so requests to our admin API can prove who they are.

import { getApps, initializeApp } from "firebase/app";
import { getAuth, onAuthStateChanged } from "firebase/auth";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
};

function getFirebaseApp() {
  // Next.js reloads modules in development, and initialising twice throws.
  const existing = getApps()[0];
  if (existing) return existing;

  // Reports WHICH values are missing, and mentions the redeploy, because the
  // first version of this message only said ".env.local" - unhelpful when the
  // problem is on the deployed site, which is where it is most likely to
  // happen. NEXT_PUBLIC_ values are compiled into the bundle at build time, so
  // adding them to a hosting dashboard changes nothing until a new build runs;
  // that is the step people miss.
  const missing = Object.entries({
    NEXT_PUBLIC_FIREBASE_API_KEY: firebaseConfig.apiKey,
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: firebaseConfig.authDomain,
    NEXT_PUBLIC_FIREBASE_PROJECT_ID: firebaseConfig.projectId,
  })
    .filter(([, value]) => !value)
    .map(([name]) => name);

  if (missing.length > 0) {
    throw new Error(
      `Firebase is not configured: ${missing.join(", ")} ${
        missing.length === 1 ? "is" : "are"
      } missing from this build. Set them in .env.local for local development, or in the hosting environment and then redeploy - these values are compiled in at build time.`
    );
  }

  return initializeApp(firebaseConfig);
}

export function getFirebaseAuth() {
  return getAuth(getFirebaseApp());
}

// Resolves with the signed-in user, or null.
//
// Needed because auth.currentUser is null for a moment after every page load,
// while the SDK restores the session from browser storage. Reading
// currentUser directly on mount therefore looks like "signed out" even when
// the admin is signed in, which would bounce them to the login page on every
// refresh.
export function waitForUser() {
  return new Promise((resolve, reject) => {
    let auth;
    try {
      auth = getFirebaseAuth();
    } catch (error) {
      reject(error);
      return;
    }

    // Fires once with the restored state, then unsubscribes.
    const unsubscribe = onAuthStateChanged(
      auth,
      (user) => {
        unsubscribe();
        resolve(user);
      },
      (error) => {
        unsubscribe();
        reject(error);
      }
    );
  });
}
