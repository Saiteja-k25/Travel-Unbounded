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

// 403, not 401: the caller proved who they are, they are simply not allowed.
// Returning 401 here would tell them to try authenticating again, which cannot
// help.
function forbidden() {
  return NextResponse.json(
    {
      success: false,
      message: "This account does not have admin access.",
      code: "not_an_admin",
    },
    { status: 403 }
  );
}

// Who is allowed in, from ADMIN_EMAILS - a comma-separated list, server-only.
//
// This exists because "any signed-in Firebase user" is NOT a safe definition
// of an admin. The Firebase Web API key is public by design: it ships in the
// browser bundle and cannot be hidden. With the Email/Password provider
// enabled, that key is enough to create an account through Google's REST API
// without any credentials at all. Verified against this project: a self-made
// account was accepted by every admin route and read real customer records.
//
// So identity is not authorisation. The token proves Google issued it; this
// list decides whether that identity is ours.
//
// Note the allowlisted account must ALREADY exist in Firebase. An address that
// is merely listed here but unregistered could be claimed by anyone through
// that same open sign-up, since Firebase does not verify ownership at sign-up.
// Quotes are stripped, from the whole value and from each entry.
//
// An env FILE loader removes surrounding quotes for you, so ADMIN_EMAILS
// ="admin@gmail.com" in .env.local arrives clean. A hosting dashboard does
// not: the quotes become part of the value, and the comparison then fails
// against every address. That is silent - the list is non-empty, so it does
// not look unconfigured; it simply never matches, and the real admin is
// refused along with everyone else. The private key needed the same treatment
// for the same reason.
function stripQuotes(value) {
  const trimmed = value.trim();
  const quoted =
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"));
  return quoted ? trimmed.slice(1, -1).trim() : trimmed;
}

function allowedAdmins() {
  return stripQuotes(process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((entry) => stripQuotes(entry).toLowerCase())
    .filter(Boolean);
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

    // The token is genuine. That settles WHO they are, not whether they are
    // allowed - see allowedAdmins() above for why those are different here.
    const admins = allowedAdmins();

    // Fail closed. If the list is missing, nobody gets in. The alternative -
    // treating an unset list as "allow everyone" - would turn a forgotten
    // environment variable in production into an open admin API, which is
    // exactly the bug this check was added to fix.
    if (admins.length === 0) {
      console.error(
        "ADMIN_EMAILS is not set, so no account can be an admin. Set it to a comma-separated list of admin email addresses."
      );
      return { ok: false, response: forbidden() };
    }

    const email = decoded.email?.toLowerCase() ?? null;

    if (!email || !admins.includes(email)) {
      // Logged so a real misconfiguration is visible, and so an attempt from
      // a self-registered account leaves a trace.
      console.warn(
        `Rejected admin request from a non-admin account: ${decoded.uid}`
      );
      return { ok: false, response: forbidden() };
    }

    return { ok: true, user: { uid: decoded.uid, email: decoded.email } };
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
