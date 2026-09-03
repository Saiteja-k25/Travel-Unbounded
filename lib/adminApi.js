// Client-side helper for calling the admin API.
//
// Every admin route requires a Firebase ID token in an Authorization header.
// Rather than repeat that in each component, this attaches it once, so a
// forgotten header cannot silently turn into a 401 that looks like a bug.

import { getFirebaseAuth, waitForUser } from "@/lib/firebaseClient";

// Thrown when there is no signed-in user at all, so callers can tell that
// apart from the server rejecting a request.
export class NotSignedInError extends Error {
  constructor() {
    super("You are not signed in.");
    this.name = "NotSignedInError";
  }
}

export async function adminFetch(path, options = {}) {
  const user = getFirebaseAuth().currentUser ?? (await waitForUser());

  if (!user) throw new NotSignedInError();

  // getIdToken() returns the cached token and refreshes it automatically when
  // it is close to expiry, so this stays valid across a long admin session
  // without us tracking the one-hour lifetime ourselves.
  let token = await user.getIdToken();

  const send = () =>
    fetch(path, {
      ...options,
      headers: {
        ...(options.body ? { "Content-Type": "application/json" } : {}),
        ...options.headers,
        Authorization: `Bearer ${token}`,
      },
    });

  let response = await send();

  // One retry with a genuinely fresh token. A cached token can be rejected if
  // it expired in the seconds between being read and reaching the server, and
  // that should not eject the admin from a page they are working in.
  if (response.status === 401) {
    const body = await response.clone().json().catch(() => null);

    if (body?.code === "token_expired") {
      token = await user.getIdToken(true); // force refresh
      response = await send();
    }
  }

  return response;
}

// Convenience wrapper: returns parsed JSON, or throws with the server's
// message so callers do not each have to unpack the response shape.
export async function adminJson(path, options = {}) {
  const response = await adminFetch(path, options);
  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const error = new Error(data?.message ?? `Request failed (${response.status}).`);
    error.status = response.status;
    error.code = data?.code;
    error.errors = data?.errors;
    throw error;
  }

  return data;
}
