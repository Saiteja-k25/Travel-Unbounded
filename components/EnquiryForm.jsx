"use client";

import { useState } from "react";
import { AlertCircle, CheckCircle2, Loader2, Send } from "lucide-react";
import FormField from "./FormField";
import {
  COUNTRY_CODES,
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
};

// Shared styling for inputs, so all three control types look identical.
const controlClasses =
  "w-full rounded-lg border bg-white px-3.5 py-2.5 text-ink outline-none transition placeholder:text-ink-soft/60 focus:ring-2 focus:ring-forest-500/40";

function controlStyle(hasError) {
  return `${controlClasses} ${
    hasError ? "border-clay-600" : "border-sand focus:border-forest-500"
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
      <div className="rounded-2xl border border-forest-200 bg-forest-50 p-8 text-center sm:p-12">
        <span className="mx-auto inline-flex h-14 w-14 items-center justify-center rounded-full bg-forest-600 text-white">
          <CheckCircle2 className="h-7 w-7" aria-hidden="true" />
        </span>

        <h2 className="mt-6 font-serif text-2xl text-forest-800 sm:text-3xl">
          Enquiry received
        </h2>
        <p className="mx-auto mt-3 max-w-md leading-relaxed text-ink-soft">
          {statusMessage}
        </p>

        <button
          type="button"
          onClick={() => {
            setStatus("idle");
            setStatusMessage("");
          }}
          className="mt-8 rounded-full border border-forest-700 px-6 py-3 text-sm font-medium text-forest-700 transition hover:bg-forest-100"
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
      className="rounded-2xl border border-sand bg-white p-6 sm:p-8"
    >
      {status === "error" && statusMessage && (
        <div
          role="alert"
          className="mb-6 flex items-start gap-3 rounded-lg border border-clay-200 bg-clay-50 p-4 text-sm text-clay-800"
        >
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
          <p>{statusMessage}</p>
        </div>
      )}

      <div className="grid gap-5 sm:grid-cols-2">
        <FormField
          label="Full Name"
          htmlFor="fullName"
          error={errors.fullName}
          required
          className="sm:col-span-2"
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
              className={`${controlStyle(errors.countryCode)} w-24 shrink-0`}
            >
              {COUNTRY_CODES.map((country) => (
                <option key={country.code} value={country.code}>
                  {country.code}
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
              className={controlStyle(errors.contactNumber)}
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
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="mt-8 inline-flex w-full items-center justify-center gap-2 rounded-full bg-forest-700 px-8 py-3.5 font-medium text-bone transition hover:bg-forest-800 disabled:cursor-not-allowed disabled:opacity-70 sm:w-auto"
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

      <p className="mt-4 text-xs text-ink-soft">
        We reply to every enquiry within 24 hours. Your details are never shared
        with third parties.
      </p>
    </form>
  );
}
