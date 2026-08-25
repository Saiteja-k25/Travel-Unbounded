// Validation rules for a booking enquiry.
//
// This module is imported by BOTH the form (for instant feedback in the
// browser) and the API route (because anyone can POST to /api/enquiry without
// ever loading our form). Keeping the rules in one file means the two can
// never drift apart.

export const HOTEL_CATEGORIES = ["Standard", "Deluxe", "Luxury"];

export const COUNTRY_CODES = [
  { code: "+91", label: "India (+91)" },
  { code: "+1", label: "USA / Canada (+1)" },
  { code: "+44", label: "UK (+44)" },
  { code: "+61", label: "Australia (+61)" },
  { code: "+65", label: "Singapore (+65)" },
  { code: "+971", label: "UAE (+971)" },
  { code: "+254", label: "Kenya (+254)" },
  { code: "+94", label: "Sri Lanka (+94)" },
  { code: "+84", label: "Vietnam (+84)" },
  { code: "+255", label: "Tanzania (+255)" },
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

export function validateEnquiry(input = {}) {
  const errors = {};

  const fullName = asString(input.fullName);
  const countryCode = asString(input.countryCode);
  const contactNumber = asString(input.contactNumber);
  const email = asString(input.email);
  const dateOfTravel = asString(input.dateOfTravel);
  const hotelCategory = asString(input.hotelCategory);
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
        }
      : null,
  };
}
