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

  if (!firebaseConfig.apiKey || !firebaseConfig.authDomain) {
    throw new Error(
      "Firebase is not configured. Add the NEXT_PUBLIC_FIREBASE_* variables to .env.local."
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
