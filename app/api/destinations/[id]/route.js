import { NextResponse } from "next/server";
import mongoose from "mongoose";
import connectToDatabase from "@/lib/mongodb";
import Destination from "@/models/Destination";
import { requireAdmin } from "@/lib/requireAdmin";
import { validateDestination } from "@/lib/validateDestination";

// PATCH  /api/destinations/:id  - update
// DELETE /api/destinations/:id  - remove
//
// Both ADMIN ONLY.

function badId() {
  return NextResponse.json(
    { success: false, message: "That is not a valid destination id." },
    { status: 400 }
  );
}

function notFound() {
  return NextResponse.json(
    { success: false, message: "That destination no longer exists." },
    { status: 404 }
  );
}

export async function PATCH(request, { params }) {
  const auth = await requireAdmin(request);
  if (!auth.ok) return auth.response;

  const { id } = await params;

  // Without this, an id that is not an ObjectId makes Mongoose throw a
  // CastError, which surfaces as a confusing 500 rather than a plain 400.
  if (!mongoose.Types.ObjectId.isValid(id)) return badId();

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, message: "Request body must be valid JSON." },
      { status: 400 }
    );
  }

  try {
    await connectToDatabase();

    const existing = await Destination.findById(id).lean();
    if (!existing) return notFound();

    // PATCH is partial, so the incoming fields are merged over what is stored
    // and the RESULT is validated in full. Validating only the incoming fields
    // would let a partial update leave the document as a whole invalid.
    const merged = {
      name: body.name ?? existing.name,
      country: body.country ?? existing.country,
      image: body.image ?? existing.image,
      imageAlt: body.imageAlt ?? existing.imageAlt,
      description: body.description ?? existing.description,
      price: body.price ?? existing.price,
      category: body.category ?? existing.category,
    };

    const { isValid, errors, data } = validateDestination(merged);

    if (!isValid) {
      return NextResponse.json(
        {
          success: false,
          message: "Please correct the highlighted fields.",
          errors,
        },
        { status: 400 }
      );
    }

    // Only the seven known fields are written, taken from the validator's
    // cleaned output. Spreading the request body would let this route set
    // anything at all on the document.
    const updated = await Destination.findByIdAndUpdate(
      id,
      { $set: data },
      { new: true, runValidators: true }
    ).lean();

    if (!updated) return notFound();

    return NextResponse.json(
      {
        success: true,
        message: `${updated.name} updated.`,
        destination: {
          id: updated._id.toString(),
          name: updated.name,
          country: updated.country,
          image: updated.image,
          imageAlt: updated.imageAlt,
          description: updated.description,
          price: updated.price,
          category: updated.category,
          createdAt: updated.createdAt,
          updatedAt: updated.updatedAt,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    if (error?.code === 11000) {
      return NextResponse.json(
        {
          success: false,
          message: "Another destination already uses that name.",
          errors: { name: "That name is already taken." },
        },
        { status: 409 }
      );
    }

    console.error("Failed to update destination:", error);

    return NextResponse.json(
      { success: false, message: "Could not update the destination." },
      { status: 500 }
    );
  }
}

export async function DELETE(request, { params }) {
  const auth = await requireAdmin(request);
  if (!auth.ok) return auth.response;

  const { id } = await params;

  if (!mongoose.Types.ObjectId.isValid(id)) return badId();

  try {
    await connectToDatabase();

    const deleted = await Destination.findByIdAndDelete(id).lean();
    if (!deleted) return notFound();

    // Note what is deliberately NOT cascaded: enquiries store the destination
    // as a plain string, captured at the time of the enquiry, not a reference.
    // So removing a destination takes it off the site and out of the enquiry
    // form's dropdown, while past enquiries keep the name they were made
    // against - which is what you want in a record of what somebody asked for.
    return NextResponse.json(
      { success: true, message: `${deleted.name} deleted.` },
      { status: 200 }
    );
  } catch (error) {
    console.error("Failed to delete destination:", error);

    return NextResponse.json(
      { success: false, message: "Could not delete the destination." },
      { status: 500 }
    );
  }
}
