"use client";

import { useState } from "react";
import { AlertCircle, CheckCircle2, Loader2, Send } from "lucide-react";
import FormField from "./FormField";
import {
  COUNTRY_CODES,
  DESTINATION_NAMES,
  HOTEL_CATEGORIES,
  validateEnquiry,
} from "@/lib/validateEnquiry";

const emptyForm = {
  fullName: "",
  countryCode: "+91",
  contactNumber: "",
  email: "",
  dateOfTravel: "",
  numberOfPeople: "1",
  numberOfChildren: "0",
  hotelCategory: "",
  destination: "",
  tripDurationNights: "",
};

// Shared styling for inputs, so all three control types look identical.
// Width is passed in rather than baked in, because the country code select
// sits next to the phone number and must not stretch to full width.
// [color-scheme:dark] tells the browser to render the native date picker and
// number spinners dark, so they match the panel instead of flashing white.
const controlClasses =
  "rounded-lg border bg-forest-900/60 px-4 py-3 text-base text-bone outline-none transition [color-scheme:dark] placeholder:text-forest-400 focus:ring-2 focus:ring-forest-400/30";

function controlStyle(hasError, widthClass = "w-full") {
  return `${controlClasses} ${widthClass} ${
    hasError ? "border-clay-400" : "border-forest-700 focus:border-forest-400"
  }`;
}

// The earliest date the user may pick: tomorrow.
function getTomorrow() {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  return date.toISOString().slice(0, 10);
}

export default function EnquiryForm() {
  const [formData, setFormData] = useState(emptyForm);
  const [errors, setErrors] = useState({});
  // One of: idle | submitting | success | error
  const [status, setStatus] = useState("idle");
  const [statusMessage, setStatusMessage] = useState("");

  const isSubmitting = status === "submitting";

  function handleChange(event) {
    const { name, value } = event.target;

    setFormData((previous) => ({ ...previous, [name]: value }));

    // Once a field has been flagged, re-check it as the user types so the
    // error clears the moment it is fixed.
    if (errors[name]) {
      const { errors: freshErrors } = validateEnquiry({
        ...formData,
        [name]: value,
      });
      setErrors((previous) => ({ ...previous, [name]: freshErrors[name] }));
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();

    // Client-side validation first: instant feedback, no wasted network call.
    const { isValid, errors: clientErrors } = validateEnquiry(formData);

    if (!isValid) {
      setErrors(clientErrors);
      setStatus("error");
      setStatusMessage("Please correct the highlighted fields below.");
      return;
    }

    setErrors({});
    setStatus("submitting");
    setStatusMessage("");

    try {
      const response = await fetch("/api/enquiry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        setStatus("success");
        setStatusMessage(result.message);
        setFormData(emptyForm);
        return;
      }

      // The server rejected it. If it sent field-level errors, show them.
      setStatus("error");
      setErrors(result.errors || {});
      setStatusMessage(
        result.message || "We could not submit your enquiry. Please try again."
      );
    } catch {
      // fetch only throws on network failure, not on a 4xx/5xx response.
      setStatus("error");
      setStatusMessage(
        "We could not reach the server. Check your connection and try again."
      );
    }
  }

  if (status === "success") {
    return (
      <div className="rounded-2xl border border-forest-700 bg-forest-800/50 p-8 text-center sm:p-12">
        <span className="mx-auto inline-flex h-14 w-14 items-center justify-center rounded-full bg-forest-600 text-white">
          <CheckCircle2 className="h-7 w-7" aria-hidden="true" />
        </span>

        <h2 className="mt-6 font-serif text-2xl text-bone sm:text-3xl">
          Enquiry received
        </h2>
        <p className="mx-auto mt-3 max-w-md leading-relaxed text-forest-200">
          {statusMessage}
        </p>

        <button
          type="button"
          onClick={() => {
            setStatus("idle");
            setStatusMessage("");
          }}
          className="mt-8 rounded-full border border-forest-500 px-6 py-3 text-sm font-medium text-forest-100 transition hover:bg-forest-800"
        >
          Submit another enquiry
        </button>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className="rounded-2xl border border-forest-700 bg-forest-800/40 p-6 sm:p-8"
    >
      {status === "error" && statusMessage && (
        <div
          role="alert"
          className="mb-6 flex items-start gap-3 rounded-lg border border-clay-500/50 bg-clay-900/40 p-4 text-sm text-clay-200"
        >
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
          <p>{statusMessage}</p>
        </div>
      )}

      <div className="grid gap-x-6 gap-y-6 sm:grid-cols-2">
        <FormField
          label="Full Name"
          htmlFor="fullName"
          error={errors.fullName}
          required
        >
          <input
            id="fullName"
            name="fullName"
            type="text"
            value={formData.fullName}
            onChange={handleChange}
            placeholder="Priya Sharma"
            aria-invalid={Boolean(errors.fullName)}
            aria-describedby={errors.fullName ? "fullName-error" : undefined}
            className={controlStyle(errors.fullName)}
          />
        </FormField>

        <FormField
          label="Contact Number"
          htmlFor="contactNumber"
          error={errors.contactNumber || errors.countryCode}
          required
        >
          <div className="flex gap-2">
            <select
              id="countryCode"
              name="countryCode"
              value={formData.countryCode}
              onChange={handleChange}
              aria-label="Country code"
              className={`${controlStyle(errors.countryCode, "w-[104px]")} shrink-0`}
            >
              {COUNTRY_CODES.map((country) => (
                <option key={country.code} value={country.code}>
                  {country.flag} {country.code}
                </option>
              ))}
            </select>

            <input
              id="contactNumber"
              name="contactNumber"
              type="tel"
              value={formData.contactNumber}
              onChange={handleChange}
              placeholder="9876543210"
              aria-invalid={Boolean(errors.contactNumber)}
              aria-describedby={
                errors.contactNumber ? "contactNumber-error" : undefined
              }
              className={`${controlStyle(errors.contactNumber, "w-full")} min-w-0 flex-1`}
            />
          </div>
        </FormField>

        <FormField label="Email" htmlFor="email" error={errors.email} required>
          <input
            id="email"
            name="email"
            type="email"
            value={formData.email}
            onChange={handleChange}
            placeholder="priya@example.com"
            aria-invalid={Boolean(errors.email)}
            aria-describedby={errors.email ? "email-error" : undefined}
            className={controlStyle(errors.email)}
          />
        </FormField>

        <FormField
          label="Destination of Interest"
          htmlFor="destination"
          error={errors.destination}
          hint="Optional. Not sure yet? Leave it blank."
        >
          <select
            id="destination"
            name="destination"
            value={formData.destination}
            onChange={handleChange}
            aria-invalid={Boolean(errors.destination)}
            aria-describedby={
              errors.destination ? "destination-error" : undefined
            }
            className={controlStyle(errors.destination)}
          >
            <option value="">No preference yet</option>
            {DESTINATION_NAMES.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </FormField>

        <FormField
          label="Date of Travel"
          htmlFor="dateOfTravel"
          error={errors.dateOfTravel}
          required
        >
          <input
            id="dateOfTravel"
            name="dateOfTravel"
            type="date"
            min={getTomorrow()}
            value={formData.dateOfTravel}
            onChange={handleChange}
            aria-invalid={Boolean(errors.dateOfTravel)}
            aria-describedby={
              errors.dateOfTravel ? "dateOfTravel-error" : undefined
            }
            className={controlStyle(errors.dateOfTravel)}
          />
        </FormField>

        <FormField
          label="Hotel Category"
          htmlFor="hotelCategory"
          error={errors.hotelCategory}
          required
        >
          <select
            id="hotelCategory"
            name="hotelCategory"
            value={formData.hotelCategory}
            onChange={handleChange}
            aria-invalid={Boolean(errors.hotelCategory)}
            aria-describedby={
              errors.hotelCategory ? "hotelCategory-error" : undefined
            }
            className={controlStyle(errors.hotelCategory)}
          >
            <option value="">Select a category</option>
            {HOTEL_CATEGORIES.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </FormField>

        <FormField
          label="Number of People"
          htmlFor="numberOfPeople"
          error={errors.numberOfPeople}
          required
        >
          <input
            id="numberOfPeople"
            name="numberOfPeople"
            type="number"
            min="1"
            value={formData.numberOfPeople}
            onChange={handleChange}
            aria-invalid={Boolean(errors.numberOfPeople)}
            aria-describedby={
              errors.numberOfPeople ? "numberOfPeople-error" : undefined
            }
            className={controlStyle(errors.numberOfPeople)}
          />
        </FormField>

        <FormField
          label="Number of Children"
          htmlFor="numberOfChildren"
          error={errors.numberOfChildren}
          hint="Optional. Leave as 0 if none."
        >
          <input
            id="numberOfChildren"
            name="numberOfChildren"
            type="number"
            min="0"
            value={formData.numberOfChildren}
            onChange={handleChange}
            aria-invalid={Boolean(errors.numberOfChildren)}
            aria-describedby={
              errors.numberOfChildren ? "numberOfChildren-error" : undefined
            }
            className={controlStyle(errors.numberOfChildren)}
          />
        </FormField>

        <FormField
          label="Trip Length"
          htmlFor="tripDurationNights"
          error={errors.tripDurationNights}
          hint="Optional. Number of nights."
        >
          <input
            id="tripDurationNights"
            name="tripDurationNights"
            type="number"
            min="1"
            max="90"
            placeholder="7"
            value={formData.tripDurationNights}
            onChange={handleChange}
            aria-invalid={Boolean(errors.tripDurationNights)}
            aria-describedby={
              errors.tripDurationNights ? "tripDurationNights-error" : undefined
            }
            className={controlStyle(errors.tripDurationNights)}
          />
        </FormField>
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="mt-9 inline-flex w-full items-center justify-center gap-2 rounded-full bg-clay-600 px-8 py-4 font-medium text-white transition hover:bg-clay-700 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
      >
        {isSubmitting ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            Submitting&hellip;
          </>
        ) : (
          <>
            <Send className="h-4 w-4" aria-hidden="true" />
            Submit Enquiry
          </>
        )}
      </button>

      <p className="mt-4 text-xs text-forest-400">
        We reply to every enquiry within 24 hours. Your details are never shared
        with third parties.
      </p>
    </form>
  );
}
