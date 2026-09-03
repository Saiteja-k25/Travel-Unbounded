// Validation rules for a destination.
//
// Mirrors lib/validateEnquiry.js: one synchronous, dependency-free function
// shared by the admin form (for instant feedback) and by the CRUD API routes
// (because anyone with a valid admin token can POST here directly, so the
// browser's checks prove nothing about what reaches the database).

export const DESTINATION_CATEGORIES = ["india", "international"];

// next/image only optimises images from hosts listed in next.config.mjs, and
// throws on anything else. So an admin saving a URL from another host would
// produce a destination that crashes the page it appears on. Validating the
// host here turns that into a form error instead.
//
// To allow another image host, add it BOTH here and to remotePatterns in
// next.config.mjs - one without the other will not work.
export const ALLOWED_IMAGE_HOSTS = ["images.unsplash.com"];

function asString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function asNumber(value) {
  if (value === "" || value === null || value === undefined) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function validateDestination(input = {}) {
  const errors = {};

  const name = asString(input.name);
  const country = asString(input.country);
  const image = asString(input.image);
  const imageAlt = asString(input.imageAlt);
  const description = asString(input.description);
  const category = asString(input.category);
  const price = asNumber(input.price);

  if (!name) {
    errors.name = "Please enter a destination name.";
  } else if (name.length < 2 || name.length > 80) {
    errors.name = "Name must be between 2 and 80 characters.";
  }

  if (!country) {
    errors.country = "Please enter a country.";
  } else if (country.length < 2 || country.length > 60) {
    errors.country = "Country must be between 2 and 60 characters.";
  }

  if (!image) {
    errors.image = "Please enter an image URL.";
  } else {
    let parsed;
    try {
      parsed = new URL(image);
    } catch {
      parsed = null;
    }

    if (!parsed) {
      errors.image = "Enter a full image URL, starting with https://.";
    } else if (parsed.protocol !== "https:") {
      errors.image = "Image URL must use https.";
    } else if (!ALLOWED_IMAGE_HOSTS.includes(parsed.hostname)) {
      errors.image = `Images must be hosted on ${ALLOWED_IMAGE_HOSTS.join(" or ")}.`;
    }
  }

  // Not decoration: the alt text is what a screen reader announces, and every
  // card on the site renders it.
  if (!imageAlt) {
    errors.imageAlt = "Please describe the image for screen readers.";
  } else if (imageAlt.length < 5 || imageAlt.length > 160) {
    errors.imageAlt = "Image description must be between 5 and 160 characters.";
  }

  if (!description) {
    errors.description = "Please enter a description.";
  } else if (description.length < 20 || description.length > 400) {
    errors.description = "Description must be between 20 and 400 characters.";
  }

  if (price === null) {
    errors.price = "Please enter a starting price.";
  } else if (!Number.isInteger(price)) {
    errors.price = "Price must be a whole number.";
  } else if (price < 1) {
    errors.price = "Price must be greater than zero.";
  } else if (price > 10000000) {
    errors.price = "Price looks too high. Enter the per-person amount.";
  }

  if (!category) {
    errors.category = "Please choose a category.";
  } else if (!DESTINATION_CATEGORIES.includes(category)) {
    errors.category = "Category must be india or international.";
  }

  const isValid = Object.keys(errors).length === 0;

  return {
    isValid,
    errors,
    // Cleaned values. The API saves this, never the raw request body, so
    // unexpected extra fields are simply dropped.
    data: isValid
      ? { name, country, image, imageAlt, description, price, category }
      : null,
  };
}
