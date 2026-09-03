import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/requireAdmin";

// GET /api/admin/me
//
// Returns who the caller is, according to the token they presented. Two jobs:
//
//   1. The dashboard uses it to confirm a session is genuinely valid on the
//      server, not merely present in the browser.
//   2. It is the smallest possible demonstration that the lock works. Called
//      without a token, or with a forged one, it must return 401 - and it does
//      so on its own, regardless of what any page in the browser believes.
export async function GET(request) {
  const auth = await requireAdmin(request);
  if (!auth.ok) return auth.response;

  return NextResponse.json({ success: true, user: auth.user }, { status: 200 });
}
