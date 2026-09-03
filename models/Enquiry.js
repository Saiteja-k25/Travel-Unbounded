import mongoose from "mongoose";
import { ENQUIRY_STATUSES, HOTEL_CATEGORIES } from "@/lib/validateEnquiry";

// Schema for a booking enquiry. The API route validates input before it gets
// here, but these rules are a second safety net at the database layer.
const enquirySchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 80,
    },
    countryCode: {
      type: String,
      required: true,
      trim: true,
    },
    contactNumber: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    dateOfTravel: {
      type: Date,
      required: true,
    },
    numberOfPeople: {
      type: Number,
      required: true,
      min: 1,
    },
    numberOfChildren: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    hotelCategory: {
      type: String,
      required: true,
      enum: HOTEL_CATEGORIES,
    },
    // Optional. Which destination prompted the enquiry, if the visitor said.
    destination: {
      type: String,
      default: null,
    },
    // Optional. Rough trip length in nights.
    tripDurationNights: {
      type: Number,
      default: null,
    },
    // How far the team has taken this enquiry. Set only from the admin
    // dashboard, never by the public form: POST /api/enquiry saves the
    // validator's cleaned output rather than the request body, so a visitor
    // cannot post a status of their choosing - it always starts at "New".
    //
    // Indexed because the dashboard filters and groups by it.
    status: {
      type: String,
      required: true,
      enum: ENQUIRY_STATUSES,
      default: ENQUIRY_STATUSES[0],
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
export default mongoose.models.Enquiry ||
  mongoose.model("Enquiry", enquirySchema);
