import { NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import Enquiry from "@/models/Enquiry";
import { validateEnquiry } from "@/lib/validateEnquiry";
import { getDestinationNames } from "@/lib/destinations";

// POST /api/enquiry
// Flow: parse -> validate -> connect -> save -> respond.
export async function POST(request) {
  // 1. Parse. A malformed body is the client's fault, so it is a 400.
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, message: "Request body must be valid JSON." },
      { status: 400 }
    );
  }

  // 2. Validate on the server. The browser already ran these same rules, but
  // anyone can POST here directly, so client-side validation proves nothing.
  //
  // The destination whitelist now comes from the database rather than a static
  // file, so it is read here and handed to the validator. This is the check
  // that actually guards what gets stored - the form's copy is only for
  // instant feedback.
  const allowedDestinations = await getDestinationNames();

  const { isValid, errors, data } = validateEnquiry(body, {
    allowedDestinations,
  });

  if (!isValid) {
    return NextResponse.json(
      {
        success: false,
        message: "Please correct the highlighted fields and try again.",
        errors,
      },
      { status: 400 }
    );
  }

  // 3. Save only the normalised values returned by the validator, never the
  // raw request body. That way unexpected extra fields are simply ignored.
  try {
    await connectToDatabase();

    const enquiry = await Enquiry.create(data);

    return NextResponse.json(
      {
        success: true,
        message:
          "Thank you! Our travel expert will contact you within 24 hours.",
        enquiryId: enquiry._id.toString(),
      },
      { status: 201 }
    );
  } catch (error) {
    // Log the real error for us, return a friendly message to the user. Never
    // leak database internals to the client.
    console.error("Failed to save enquiry:", error);

    return NextResponse.json(
      {
        success: false,
        message:
          "Something went wrong while submitting your enquiry. Please try again.",
      },
      { status: 500 }
    );
  }
}
