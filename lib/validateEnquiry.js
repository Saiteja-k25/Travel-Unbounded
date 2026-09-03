// Validation rules for a booking enquiry.
//
// This module is imported by BOTH the form (for instant feedback in the
// browser) and the API route (because anyone can POST to /api/enquiry without
// ever loading our form). Keeping the rules in one file means the two can
// never drift apart.

export const HOTEL_CATEGORIES = ["Standard", "Deluxe", "Luxury"];

// How far along an enquiry is. Exported from here, next to HOTEL_CATEGORIES,
// so that the schema enum, the PATCH route that changes a status, the
// dashboard's dropdown and the analytics chart all read from one list and
// cannot drift apart.
//
// The first entry is the default for a new enquiry.
export const ENQUIRY_STATUSES = ["New", "Contacted", "Converted", "Closed"];

// NOTE: this module used to derive DESTINATION_NAMES from data/destinations.js
// at import time. Destinations now live in MongoDB, and that could not work:
// this file is imported by EnquiryForm, which runs in the browser, and the
// browser has no database access - adding a Mongo import here would have tried
// to bundle the driver into the client.
//
// So the caller supplies the list instead, via the `allowedDestinations`
// option below. This function stays synchronous, dependency-free and safe on
// both sides of the client/server boundary.

export const COUNTRY_CODES = [
  { code: "+91", flag: "\u{1F1EE}\u{1F1F3}", label: "India" },
  { code: "+1", flag: "\u{1F1FA}\u{1F1F8}", label: "USA / Canada" },
  { code: "+44", flag: "\u{1F1EC}\u{1F1E7}", label: "United Kingdom" },
  { code: "+61", flag: "\u{1F1E6}\u{1F1FA}", label: "Australia" },
  { code: "+65", flag: "\u{1F1F8}\u{1F1EC}", label: "Singapore" },
  { code: "+971", flag: "\u{1F1E6}\u{1F1EA}", label: "UAE" },
  { code: "+254", flag: "\u{1F1F0}\u{1F1EA}", label: "Kenya" },
  { code: "+94", flag: "\u{1F1F1}\u{1F1F0}", label: "Sri Lanka" },
  { code: "+84", flag: "\u{1F1FB}\u{1F1F3}", label: "Vietnam" },
  { code: "+255", flag: "\u{1F1F9}\u{1F1FF}", label: "Tanzania" },
];

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i;
const COUNTRY_CODE_PATTERN = /^\+\d{1,4}$/;

// Returns today's date as YYYY-MM-DD. Comparing date strings avoids the
// timezone bugs you get from comparing Date objects directly.
function getTodayAsString() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// Turns "" / null / undefined into a trimmed string so the checks below only
// ever deal with strings.
function asString(value) {
  return typeof value === "string" ? value.trim() : "";
}

// Accepts numbers and numeric strings; returns null for anything else.
function asNumber(value) {
  if (value === "" || value === null || value === undefined) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

// `options.allowedDestinations` is the list of destination names currently on
// offer, read from the database by the caller.
//
// When it is not supplied the destination check is skipped rather than
// failing everything. That is deliberate: destination is an OPTIONAL field, so
// the cost of a bogus value is a slightly wrong label on a lead, not a
// security hole. A required or security-relevant field would fail closed
// instead.
export function validateEnquiry(input = {}, options = {}) {
  const { allowedDestinations = null } = options;
  const errors = {};

  const fullName = asString(input.fullName);
  const countryCode = asString(input.countryCode);
  const contactNumber = asString(input.contactNumber);
  const email = asString(input.email);
  const dateOfTravel = asString(input.dateOfTravel);
  const hotelCategory = asString(input.hotelCategory);
  // Optional extras: a destination of interest and a rough trip length.
  const destination = asString(input.destination);
  const tripDurationNights =
    input.tripDurationNights === "" ||
    input.tripDurationNights === null ||
    input.tripDurationNights === undefined
      ? null
      : asNumber(input.tripDurationNights);
  const numberOfPeople = asNumber(input.numberOfPeople);
  // Children is optional, so a blank value means zero rather than an error.
  const numberOfChildren =
    input.numberOfChildren === "" ||
    input.numberOfChildren === null ||
    input.numberOfChildren === undefined
      ? 0
      : asNumber(input.numberOfChildren);

  if (!fullName) {
    errors.fullName = "Please enter your full name.";
  } else if (fullName.length < 2 || fullName.length > 80) {
    errors.fullName = "Name must be between 2 and 80 characters.";
  }

  if (!countryCode) {
    errors.countryCode = "Please select a country code.";
  } else if (!COUNTRY_CODE_PATTERN.test(countryCode)) {
    errors.countryCode = "Country code must look like +91.";
  }

  const digitsOnly = contactNumber.replace(/[\s-]/g, "");
  if (!contactNumber) {
    errors.contactNumber = "Please enter your contact number.";
  } else if (!/^\d{6,15}$/.test(digitsOnly)) {
    errors.contactNumber = "Enter a valid phone number (6 to 15 digits).";
  }

  if (!email) {
    errors.email = "Please enter your email address.";
  } else if (!EMAIL_PATTERN.test(email)) {
    errors.email = "Enter a valid email address, e.g. name@example.com.";
  }

  if (!dateOfTravel) {
    errors.dateOfTravel = "Please choose your date of travel.";
  } else if (!/^\d{4}-\d{2}-\d{2}$/.test(dateOfTravel)) {
    errors.dateOfTravel = "Enter a valid date.";
  } else if (Number.isNaN(new Date(`${dateOfTravel}T00:00:00`).getTime())) {
    errors.dateOfTravel = "Enter a valid date.";
  } else if (dateOfTravel <= getTodayAsString()) {
    errors.dateOfTravel = "Date of travel must be in the future.";
  }

  if (numberOfPeople === null) {
    errors.numberOfPeople = "Please enter the number of people.";
  } else if (!Number.isInteger(numberOfPeople) || numberOfPeople < 1) {
    errors.numberOfPeople = "There must be at least 1 traveller.";
  } else if (numberOfPeople > 50) {
    errors.numberOfPeople = "For groups over 50, please call us instead.";
  }

  if (numberOfChildren === null) {
    errors.numberOfChildren = "Enter a number, or leave this blank.";
  } else if (!Number.isInteger(numberOfChildren) || numberOfChildren < 0) {
    errors.numberOfChildren = "Number of children cannot be negative.";
  } else if (numberOfChildren > 20) {
    errors.numberOfChildren = "Please enter 20 or fewer children.";
  }

  if (!hotelCategory) {
    errors.hotelCategory = "Please select a hotel category.";
  } else if (!HOTEL_CATEGORIES.includes(hotelCategory)) {
    errors.hotelCategory = "Choose Standard, Deluxe or Luxury.";
  }

  // Optional, but if one is given it has to be a destination we offer. Only
  // checked when the caller told us what those are.
  if (
    destination &&
    Array.isArray(allowedDestinations) &&
    !allowedDestinations.includes(destination)
  ) {
    errors.destination = "Choose one of our destinations, or leave it blank.";
  }

  if (
    tripDurationNights !== null &&
    (!Number.isInteger(tripDurationNights) ||
      tripDurationNights < 1 ||
      tripDurationNights > 90)
  ) {
    errors.tripDurationNights = "Enter 1 to 90 nights, or leave it blank.";
  }

  const isValid = Object.keys(errors).length === 0;

  return {
    isValid,
    errors,
    // Cleaned-up values. The API saves this, never the raw request body.
    data: isValid
      ? {
          fullName,
          countryCode,
          contactNumber: digitsOnly,
          email: email.toLowerCase(),
          dateOfTravel,
          numberOfPeople,
          numberOfChildren,
          hotelCategory,
          destination: destination || null,
          tripDurationNights,
        }
      : null,
  };
}
