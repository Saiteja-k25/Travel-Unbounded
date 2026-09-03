"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "firebase/auth";
import { AlertCircle, Loader2, LogOut, ShieldCheck } from "lucide-react";
import { getFirebaseAuth, waitForUser } from "@/lib/firebaseClient";
import { adminJson, NotSignedInError } from "@/lib/adminApi";

// Wraps every admin screen.
//
// This is the CONVENIENCE lock: it keeps an honest person who is not signed in
// from seeing an admin page, and sends them to the login screen. It is not
// what protects the data, and it could be bypassed by anyone willing to edit
// the JavaScript running in their own browser.
//
// The real protection is requireAdmin() on each API route. That is why this
// component does not simply trust that Firebase reports a signed-in user: it
// calls /api/admin/me and lets the SERVER confirm the session. If the server
// disagrees - revoked token, disabled account, expired session - the admin is
// signed out, rather than being shown a dashboard whose every request will
// fail.
export default function AdminGate({ children }) {
  const router = useRouter();

  const [state, setState] = useState("checking"); // checking | ready | error
  const [user, setUser] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function check() {
      try {
        // Firebase needs a moment after page load to restore the session from
        // browser storage; without waiting, a refresh looks like a sign-out.
        const signedIn = await waitForUser();

        if (!active) return;

        if (!signedIn) {
          router.replace("/admin/login");
          return;
        }

        // Ask the server whether it agrees. This is the check that counts.
        const result = await adminJson("/api/admin/me");

        if (!active) return;

        setUser(result.user);
        setState("ready");
      } catch (caught) {
        if (!active) return;

        if (caught instanceof NotSignedInError || caught?.status === 401) {
          router.replace("/admin/login");
          return;
        }

        setError(
          caught?.message ?? "Could not confirm your session. Please try again."
        );
        setState("error");
      }
    }

    check();

    return () => {
      active = false;
    };
  }, [router]);

  const handleSignOut = useCallback(async () => {
    try {
      await signOut(getFirebaseAuth());
    } finally {
      router.replace("/admin/login");
    }
  }, [router]);

  if (state === "checking") {
    return (
      <main className="flex flex-1 items-center justify-center bg-forest-900 py-32">
        <p className="flex items-center gap-2 text-sm text-forest-200">
          <Loader2
            className="h-4 w-4 animate-spin motion-reduce:animate-none"
            aria-hidden="true"
          />
          Confirming your session...
        </p>
      </main>
    );
  }

  if (state === "error") {
    return (
      <main className="flex flex-1 items-center justify-center bg-forest-900 px-5 py-32">
        <div className="max-w-md rounded-2xl border border-clay-500/50 bg-clay-900/40 p-6 text-sm text-clay-200">
          <p className="flex items-start gap-3">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            {error}
          </p>
          <button
            type="button"
            onClick={handleSignOut}
            className="mt-5 rounded-full border border-clay-400/60 px-5 py-2.5 text-xs font-medium text-clay-100 transition hover:bg-clay-900/60"
          >
            Sign out and try again
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="flex-1 bg-forest-900">
      {/* Admin bar. Deliberately distinct from the public site, so there is
          never any doubt about which side of the login you are on. */}
      <div className="border-b border-forest-700 bg-forest-800">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-5 py-3.5 sm:px-8">
          <p className="flex items-center gap-2 text-sm text-forest-100">
            <ShieldCheck className="h-4 w-4 text-clay-300" aria-hidden="true" />
            <span className="font-medium">Admin</span>
            <span className="text-forest-400">&middot;</span>
            <span className="text-forest-300">{user?.email}</span>
          </p>

          <button
            type="button"
            onClick={handleSignOut}
            className="inline-flex items-center gap-1.5 rounded-full border border-forest-600 px-4 py-2 text-xs font-medium text-forest-100 transition hover:bg-forest-700"
          >
            <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
            Sign out
          </button>
        </div>
      </div>

      {children}
    </main>
  );
}
