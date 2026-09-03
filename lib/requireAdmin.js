// The lock on every admin API route.
//
// SERVER ONLY.
//
// Why this exists rather than a middleware.js file:
//
//   1. Next.js middleware runs on the Edge runtime, which does not provide the
//      Node crypto APIs the Firebase Admin SDK needs to verify a token
//      signature. Verification simply cannot happen there.
//   2. Even if it could, a single gate in front of the routes is one thing to
//      forget or misconfigure. Calling this as the first line of each handler
//      means a route is only reachable if it has explicitly opted in.
//
// Gating the /admin PAGE in the browser is not a substitute for this. An
// attacker does not open /admin in a browser; they send a request straight to
// the API, which never loads the React app, so no page-level check ever runs.
// This function is what actually protects the data.

import { NextResponse } from "next/server";
import { getAdminAuth } from "@/lib/firebaseAdmin";

function unauthorised(message, code) {
  return NextResponse.json(
    { success: false, message, code },
    {
      status: 401,
      // Tells a well-behaved client how it is meant to authenticate.
      headers: { "WWW-Authenticate": 'Bearer realm="admin"' },
    }
  );
}

// Returns { ok: true, user } when the caller is a signed-in admin, or
// { ok: false, response } carrying the 401 to return.
//
// Usage in a route handler:
//
//   const auth = await requireAdmin(request);
//   if (!auth.ok) return auth.response;
//   // ... auth.user.uid / auth.user.email are now trustworthy
export async function requireAdmin(request) {
  const header = request.headers.get("authorization") ?? "";
  const match = header.match(/^Bearer\s+(.+)$/i);

  if (!match) {
    return {
      ok: false,
      response: unauthorised(
        "This endpoint requires an admin session.",
        "missing_token"
      ),
    };
  }

  const idToken = match[1].trim();

  try {
    // The second argument is checkRevoked. It costs an extra call to Google on
    // every request, and buys the ability to lock someone out immediately:
    // without it, a token stays valid for up to an hour after the account is
    // disabled or its sessions are revoked. For an admin surface holding
    // customer contact details, that trade is worth making.
    const decoded = await getAdminAuth().verifyIdToken(idToken, true);

    // Any account in this Firebase project is an admin. The project exists
    // solely for the dashboard and contains only the admin user, so there is
    // no second class of user to distinguish. If the site ever had public
    // Firebase accounts, this is where a custom claim check would go, and
    // without one every visitor would become an admin.
    return {
      ok: true,
      user: { uid: decoded.uid, email: decoded.email ?? null },
    };
  } catch (error) {
    // Log the real reason for us; return something a client can act on but
    // which does not describe our internals.
    console.error("Admin token verification failed:", error?.code, error?.message);

    // Expiry is worth distinguishing: tokens last about an hour, and the
    // client SDK can silently refresh and retry rather than dumping the admin
    // back at the login screen mid-task.
    const expired =
      error?.code === "auth/id-token-expired" ||
      error?.code === "auth/session-cookie-expired";

    if (expired) {
      return {
        ok: false,
        response: unauthorised("Your session has expired.", "token_expired"),
      };
    }

    return {
      ok: false,
      response: unauthorised("Your admin session is not valid.", "invalid_token"),
    };
  }
}
