"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { signInWithEmailAndPassword } from "firebase/auth";
import { AlertCircle, Loader2, LogIn } from "lucide-react";
import { getFirebaseAuth, waitForUser } from "@/lib/firebaseClient";

// Maps Firebase's error codes to something a person can act on.
//
// Wrong email and wrong password deliberately give the SAME message. Firebase
// itself now returns auth/invalid-credential for both, and that is the right
// behaviour: telling an attacker "that email exists but the password is wrong"
// hands them half the answer.
function messageForError(code) {
  switch (code) {
    case "auth/invalid-credential":
    case "auth/wrong-password":
    case "auth/user-not-found":
      return "That email and password combination is not correct.";
    case "auth/invalid-email":
      return "Enter a valid email address.";
    case "auth/user-disabled":
      return "This account has been disabled.";
    case "auth/too-many-requests":
      return "Too many attempts. Wait a few minutes and try again.";
    case "auth/network-request-failed":
      return "Could not reach the authentication service. Check your connection.";
    default:
      return "Could not sign you in. Please try again.";
  }
}

export default function AdminLoginForm() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  // Starts true because we cannot know whether there is a session until
  // Firebase has restored it from browser storage.
  const [isCheckingSession, setIsCheckingSession] = useState(true);

  // Someone already signed in has no business on the login page.
  useEffect(() => {
    let active = true;

    waitForUser()
      .then((user) => {
        if (!active) return;
        if (user) router.replace("/admin");
        else setIsCheckingSession(false);
      })
      .catch(() => {
        // A configuration problem, which the form itself will report clearly
        // when it is submitted. Show the form rather than a blank page.
        if (active) setIsCheckingSession(false);
      });

    return () => {
      active = false;
    };
  }, [router]);

  async function handleSubmit(event) {
    event.preventDefault();

    if (isSubmitting) return;

    setError("");
    setIsSubmitting(true);

    try {
      // The password goes straight from this form to Google. It never reaches
      // our server and we never store it, which is the main reason for using
      // Firebase Auth rather than rolling our own.
      await signInWithEmailAndPassword(
        getFirebaseAuth(),
        email.trim(),
        password
      );

      // replace() rather than push(), so the back button does not return to a
      // login page the admin is already past.
      router.replace("/admin");
    } catch (caught) {
      setError(messageForError(caught?.code));
      setIsSubmitting(false);
    }
  }

  if (isCheckingSession) {
    return (
      <div className="flex items-center justify-center gap-2 rounded-2xl border border-forest-700 bg-forest-800/40 p-8 text-sm text-forest-200">
        <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />
        Checking your session...
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-2xl border border-forest-700 bg-forest-800/40 p-7 sm:p-8"
    >
      {error && (
        <p
          role="alert"
          className="mb-6 flex items-start gap-3 rounded-lg border border-clay-500/50 bg-clay-900/40 p-4 text-sm text-clay-200"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          {error}
        </p>
      )}

      <div className="space-y-5">
        <div>
          <label
            htmlFor="admin-email"
            className="block text-sm font-medium text-forest-100"
          >
            Email
          </label>
          <input
            id="admin-email"
            name="email"
            type="email"
            required
            autoComplete="username"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            disabled={isSubmitting}
            className="mt-2 w-full rounded-lg border border-forest-700 bg-forest-900/60 px-4 py-3 text-base text-bone outline-none transition placeholder:text-forest-400 focus:border-forest-400 focus:ring-2 focus:ring-forest-400/30 disabled:opacity-60"
            placeholder="admin@gmail.com"
          />
        </div>

        <div>
          <label
            htmlFor="admin-password"
            className="block text-sm font-medium text-forest-100"
          >
            Password
          </label>
          <input
            id="admin-password"
            name="password"
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            disabled={isSubmitting}
            className="mt-2 w-full rounded-lg border border-forest-700 bg-forest-900/60 px-4 py-3 text-base text-bone outline-none transition placeholder:text-forest-400 focus:border-forest-400 focus:ring-2 focus:ring-forest-400/30 disabled:opacity-60"
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="mt-8 inline-flex w-full items-center justify-center gap-2 rounded-full bg-clay-600 px-8 py-4 font-medium text-white transition hover:bg-clay-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSubmitting ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />
            Signing in...
          </>
        ) : (
          <>
            <LogIn className="h-4 w-4" aria-hidden="true" />
            Sign in
          </>
        )}
      </button>
    </form>
  );
}
