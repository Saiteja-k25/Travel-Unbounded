import mongoose from "mongoose";
import { DESTINATION_CATEGORIES } from "@/lib/validateDestination";

// Schema for a destination.
//
// Phase 1 kept these in data/destinations.js as a static array. They live in
// the database now because Phase 2 asks for full CRUD on them - an admin
// adding a destination has to be able to change what the site shows, which a
// file baked into the build cannot do.
//
// Field names deliberately match the old static objects, so DestinationCard
// and the carousel render these without any change.
const destinationSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 80,
      // Enquiries reference a destination by name, and the enquiry form offers
      // them in a dropdown, so two destinations sharing a name would be
      // genuinely ambiguous rather than merely untidy.
      unique: true,
    },
    country: {
      type: String,
      required: true,
      trim: true,
      maxlength: 60,
    },
    image: {
      type: String,
      required: true,
      trim: true,
    },
    // What a screen reader announces for the card image.
    imageAlt: {
      type: String,
      required: true,
      trim: true,
      maxlength: 160,
    },
    description: {
      type: String,
      required: true,
      trim: true,
      maxlength: 400,
    },
    // Indicative per-person starting price, in rupees.
    price: {
      type: Number,
      required: true,
      min: 1,
    },
    // Drives which of the two home page sections a destination appears in.
    // Indexed because both of those queries filter on it.
    category: {
      type: String,
      required: true,
      enum: DESTINATION_CATEGORIES,
      index: true,
    },
  },
  {
    // Adds createdAt and updatedAt automatically.
    timestamps: true,
  }
);

// In development Next.js re-runs this file on every reload. Without the
// mongoose.models check, Mongoose throws "Cannot overwrite model once compiled".
export default mongoose.models.Destination ||
  mongoose.model("Destination", destinationSchema);
