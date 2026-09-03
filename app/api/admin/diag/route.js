import { NextResponse } from "next/server";

// TEMPORARY diagnostic. Delete once the deployment issue is understood.
//
// Every route that imports lib/requireAdmin.js returns an empty 500 on Vercel
// but works locally, including in a production build. An empty body means the
// failure happens while the module is being imported, so there is no handler
// left to report anything - and Vercel's function logs are not reachable from
// here.
//
// This route imports nothing at module scope. It reports which variables are
// present (never their values) and what happens when firebase-admin is
// imported and used, so the real error message comes back in the response.
export async function GET() {
  const report = { step: "start", env: {}, imports: {}, credential: null };

  // Presence only. No value is ever included.
  for (const key of [
    "MONGODB_URI",
    "GROQ_API_KEY",
    "NEXT_PUBLIC_FIREBASE_API_KEY",
    "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN",
    "NEXT_PUBLIC_FIREBASE_PROJECT_ID",
    "FIREBASE_PROJECT_ID",
    "FIREBASE_CLIENT_EMAIL",
    "FIREBASE_PRIVATE_KEY",
  ]) {
    const value = process.env[key];
    report.env[key] = value ? `set (${value.length} chars)` : "MISSING";
  }

  // Does the package load at all?
  try {
    const app = await import("firebase-admin/app");
    report.imports["firebase-admin/app"] = `ok (${Object.keys(app).length} exports)`;
  } catch (error) {
    report.imports["firebase-admin/app"] = `FAILED: ${error?.message}`;
  }

  try {
    const auth = await import("firebase-admin/auth");
    report.imports["firebase-admin/auth"] = `ok (${Object.keys(auth).length} exports)`;
  } catch (error) {
    report.imports["firebase-admin/auth"] = `FAILED: ${error?.message}`;
  }

  // Does our own module load?
  try {
    const mod = await import("@/lib/requireAdmin");
    report.imports["lib/requireAdmin"] = `ok (${Object.keys(mod).join(",")})`;
  } catch (error) {
    report.imports["lib/requireAdmin"] = `FAILED: ${error?.message}`;
  }

  // Can a credential actually be built from the environment?
  try {
    const { cert } = await import("firebase-admin/app");
    const raw = process.env.FIREBASE_PRIVATE_KEY ?? "";
    let key = raw.trim().replace(/,\s*$/, "");
    if (
      (key.startsWith('"') && key.endsWith('"')) ||
      (key.startsWith("'") && key.endsWith("'"))
    ) {
      key = key.slice(1, -1);
    }
    key = key.replace(/\\+n/g, "\n");

    report.credential = {
      privateKeyLines: key ? key.trim().split("\n").length : 0,
      hasBeginMarker: key.includes("-----BEGIN PRIVATE KEY-----"),
    };

    cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: key,
    });
    report.credential.certAccepted = true;
  } catch (error) {
    report.credential = { ...report.credential, certError: error?.message };
  }

  report.step = "done";
  report.runtime = process.version;

  return NextResponse.json(report, { status: 200 });
}
