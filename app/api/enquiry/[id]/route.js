import { NextResponse } from "next/server";
import mongoose from "mongoose";
import connectToDatabase from "@/lib/mongodb";
import Enquiry from "@/models/Enquiry";
import { requireAdmin } from "@/lib/requireAdmin";
import { ENQUIRY_STATUSES } from "@/lib/validateEnquiry";

// PATCH /api/enquiry/:id
//
// Moves an enquiry along: New -> Contacted -> Converted / Closed.
//
// ADMIN ONLY.
export async function PATCH(request, { params }) {
  const auth = await requireAdmin(request);
  if (!auth.ok) return auth.response;

  // params is a promise in this version of Next.
  const { id } = await params;

  // An id that is not a valid ObjectId would make Mongoose throw a CastError,
  // which would surface as a confusing 500 rather than a plain 400.
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json(
      { success: false, message: "That is not a valid enquiry id." },
      { status: 400 }
    );
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, message: "Request body must be valid JSON." },
      { status: 400 }
    );
  }

  const status = typeof body?.status === "string" ? body.status.trim() : "";

  // Checked against the shared list, so the database can never end up holding
  // a status the dashboard and the analytics chart do not know about. The
  // browser sends this from a fixed dropdown, but the route is reachable with
  // curl, so the dropdown proves nothing.
  if (!ENQUIRY_STATUSES.includes(status)) {
    return NextResponse.json(
      {
        success: false,
        message: `Status must be one of: ${ENQUIRY_STATUSES.join(", ")}.`,
        errors: { status: "Unrecognised status." },
      },
      { status: 400 }
    );
  }

  try {
    await connectToDatabase();

    // Only `status` is written, and it is named explicitly rather than spread
    // from the body. Passing the request body straight to findByIdAndUpdate
    // would let this endpoint rewrite a customer's email, travel date or
    // phone number - a status route has no business touching those, and an
    // admin session should not be a licence to edit anything at all.
    const updated = await Enquiry.findByIdAndUpdate(
      id,
      { $set: { status } },
      { new: true, runValidators: true }
    ).lean();

    if (!updated) {
      return NextResponse.json(
        { success: false, message: "That enquiry no longer exists." },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: `Marked as ${status}.`,
        enquiry: {
          id: updated._id.toString(),
          status: updated.status,
          updatedAt: updated.updatedAt,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Failed to update enquiry status:", error);

    return NextResponse.json(
      { success: false, message: "Could not update the enquiry. Please try again." },
      { status: 500 }
    );
  }
}
