import { NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import Destination from "@/models/Destination";
import { requireAdmin } from "@/lib/requireAdmin";
import { validateDestination } from "@/lib/validateDestination";

// /api/destinations
//
//   GET  - public. Destinations are the shop window; the home page already
//          shows every one of them, so there is nothing here to protect.
//   POST - admin only.
//
// This file deliberately mixes a public read with a protected write, which
// app/api/enquiries/route.js avoids doing. The difference is what the data is:
// an enquiry is somebody's name, email and phone number, so that file keeps
// public and admin handlers apart to remove any doubt. A destination is
// marketing copy and a price already on the public site.

export const dynamic = "force-dynamic";

// Shapes a document for the client. _id is an ObjectId, which cannot be
// serialised, and the site's components were written against `id`.
function toPlainObject(document) {
  return {
    id: document._id.toString(),
    name: document.name,
    country: document.country,
    image: document.image,
    imageAlt: document.imageAlt,
    description: document.description,
    price: document.price,
    category: document.category,
    createdAt: document.createdAt,
    updatedAt: document.updatedAt,
  };
}

export async function GET() {
  try {
    await connectToDatabase();

    const documents = await Destination.find({})
      .sort({ category: 1, price: 1 })
      .lean();

    return NextResponse.json(
      { success: true, destinations: documents.map(toPlainObject) },
      { status: 200 }
    );
  } catch (error) {
    console.error("Failed to load destinations:", error);

    return NextResponse.json(
      { success: false, message: "Could not load destinations." },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  const auth = await requireAdmin(request);
  if (!auth.ok) return auth.response;

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, message: "Request body must be valid JSON." },
      { status: 400 }
    );
  }

  // Same rules the admin form runs, re-run here because this route is
  // reachable with curl by anyone holding a valid admin token.
  const { isValid, errors, data } = validateDestination(body);

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

  try {
    await connectToDatabase();

    // Only the validator's cleaned output is saved, never the raw body, so
    // unexpected extra fields are dropped rather than stored.
    const created = await Destination.create(data);

    return NextResponse.json(
      {
        success: true,
        message: `${created.name} added.`,
        destination: toPlainObject(created),
      },
      { status: 201 }
    );
  } catch (error) {
    // 11000 is MongoDB's duplicate key error. The name has a unique index,
    // because enquiries reference a destination by name and two with the same
    // name would be genuinely ambiguous rather than merely untidy.
    if (error?.code === 11000) {
      return NextResponse.json(
        {
          success: false,
          message: "A destination with that name already exists.",
          errors: { name: "That name is already taken." },
        },
        { status: 409 }
      );
    }

    console.error("Failed to create destination:", error);

    return NextResponse.json(
      { success: false, message: "Could not save the destination." },
      { status: 500 }
    );
  }
}
