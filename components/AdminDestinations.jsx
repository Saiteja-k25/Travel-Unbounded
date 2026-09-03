"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import {
  AlertCircle,
  Check,
  Loader2,
  MapPin,
  Pencil,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { adminJson } from "@/lib/adminApi";
import {
  ALLOWED_IMAGE_HOSTS,
  DESTINATION_CATEGORIES,
  validateDestination,
} from "@/lib/validateDestination";

// Destinations CRUD.
//
// These rows are what the public home page and the enquiry form's dropdown are
// built from, so a change here changes the live site - both of those pages
// read per request rather than at build time.

const EMPTY_FORM = {
  name: "",
  country: "",
  image: "",
  imageAlt: "",
  description: "",
  price: "",
  category: "india",
};

const CATEGORY_LABELS = { india: "India", international: "International" };

function formatPrice(value) {
  if (typeof value !== "number") return "—";
  return `₹${value.toLocaleString("en-IN")}`;
}

export default function AdminDestinations() {
  const [destinations, setDestinations] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  // null when the form is closed, "create" when adding, or the id being edited.
  const [mode, setMode] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formErrors, setFormErrors] = useState({});
  const [formMessage, setFormMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const [confirmingId, setConfirmingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [notice, setNotice] = useState("");

  // Reads are public, so a plain fetch is enough - no token needed. Writes
  // below go through adminJson, which attaches one.
  //
  // As in AdminEnquiries, nothing is set synchronously in the effect body;
  // that causes a render pass before paint, which React flags as cascading.
  useEffect(() => {
    let active = true;

    fetch("/api/destinations")
      .then((response) => response.json())
      .then((result) => {
        if (!active) return;
        if (!result?.success) throw new Error(result?.message ?? "Failed to load.");
        setDestinations(result.destinations ?? []);
        setLoadError("");
      })
      .catch((caught) => {
        if (active) setLoadError(caught?.message ?? "Could not load destinations.");
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [reloadKey]);

  const refresh = useCallback(() => {
    setIsLoading(true);
    setReloadKey((current) => current + 1);
  }, []);

  function openCreate() {
    setMode("create");
    setForm(EMPTY_FORM);
    setFormErrors({});
    setFormMessage("");
    setNotice("");
  }

  function openEdit(destination) {
    setMode(destination.id);
    setForm({
      name: destination.name,
      country: destination.country,
      image: destination.image,
      imageAlt: destination.imageAlt,
      description: destination.description,
      // The form holds strings; the validator coerces and the API stores a number.
      price: String(destination.price),
      category: destination.category,
    });
    setFormErrors({});
    setFormMessage("");
    setNotice("");
  }

  function closeForm() {
    setMode(null);
    setForm(EMPTY_FORM);
    setFormErrors({});
    setFormMessage("");
  }

  function handleField(event) {
    const { name, value } = event.target;
    setForm((previous) => ({ ...previous, [name]: value }));

    // Re-check a field that is already flagged, so the error clears as soon as
    // it is fixed rather than on the next submit.
    if (formErrors[name]) {
      const { errors } = validateDestination({ ...form, [name]: value });
      setFormErrors((previous) => ({ ...previous, [name]: errors[name] }));
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (isSaving) return;

    // The same rules run on the server. This is only for instant feedback.
    const { isValid, errors } = validateDestination(form);

    if (!isValid) {
      setFormErrors(errors);
      setFormMessage("Please correct the highlighted fields.");
      return;
    }

    setIsSaving(true);
    setFormErrors({});
    setFormMessage("");

    const isCreate = mode === "create";

    try {
      const result = await adminJson(
        isCreate ? "/api/destinations" : `/api/destinations/${mode}`,
        {
          method: isCreate ? "POST" : "PATCH",
          body: JSON.stringify({ ...form, price: Number(form.price) }),
        }
      );

      closeForm();
      setNotice(result?.message ?? "Saved.");
      refresh();
    } catch (caught) {
      // The server sends field-level errors for a 400 or 409; show them
      // against the fields rather than as one opaque message.
      setFormErrors(caught?.errors ?? {});
      setFormMessage(caught?.message ?? "Could not save. Please try again.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete(destination) {
    setDeletingId(destination.id);
    setNotice("");

    try {
      const result = await adminJson(`/api/destinations/${destination.id}`, {
        method: "DELETE",
      });
      setConfirmingId(null);
      setNotice(result?.message ?? "Deleted.");
      refresh();
    } catch (caught) {
      setLoadError(caught?.message ?? "Could not delete that destination.");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <section>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="font-serif text-2xl text-bone sm:text-3xl">
            Destinations
          </h2>
          <p className="mt-2 text-sm text-forest-300">
            {isLoading
              ? " "
              : `${destinations.length} on the site — changes appear immediately`}
          </p>
        </div>

        {mode === null && (
          <button
            type="button"
            onClick={openCreate}
            className="inline-flex items-center gap-2 rounded-full bg-clay-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-clay-700"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            Add destination
          </button>
        )}
      </div>

      {notice && (
        <p className="mt-5 flex items-start gap-2.5 rounded-lg border border-forest-600 bg-forest-800/60 p-3.5 text-sm text-forest-100">
          <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" aria-hidden="true" />
          {notice}
        </p>
      )}

      {mode !== null && (
        <form
          onSubmit={handleSubmit}
          className="mt-6 rounded-2xl border border-forest-700 bg-forest-800/40 p-6 sm:p-7"
        >
          <div className="flex items-center justify-between gap-3">
            <h3 className="font-serif text-xl text-bone">
              {mode === "create" ? "New destination" : "Edit destination"}
            </h3>
            <button
              type="button"
              onClick={closeForm}
              aria-label="Close the form"
              className="rounded-full p-2 text-forest-200 transition hover:bg-forest-700"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>

          {formMessage && (
            <p
              role="alert"
              className="mt-5 flex items-start gap-3 rounded-lg border border-clay-500/50 bg-clay-900/40 p-4 text-sm text-clay-200"
            >
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              {formMessage}
            </p>
          )}

          <div className="mt-6 grid gap-5 sm:grid-cols-2">
            <Field label="Name" name="name" error={formErrors.name}>
              <input
                id="name"
                name="name"
                value={form.name}
                onChange={handleField}
                maxLength={80}
                className={inputClass(formErrors.name)}
                placeholder="Kerala"
              />
            </Field>

            <Field label="Country" name="country" error={formErrors.country}>
              <input
                id="country"
                name="country"
                value={form.country}
                onChange={handleField}
                maxLength={60}
                className={inputClass(formErrors.country)}
                placeholder="India"
              />
            </Field>

            <Field label="Category" name="category" error={formErrors.category}>
              <select
                id="category"
                name="category"
                value={form.category}
                onChange={handleField}
                className={inputClass(formErrors.category)}
              >
                {DESTINATION_CATEGORIES.map((category) => (
                  <option key={category} value={category}>
                    {CATEGORY_LABELS[category] ?? category}
                  </option>
                ))}
              </select>
            </Field>

            <Field
              label="Starting price per person (₹)"
              name="price"
              error={formErrors.price}
            >
              <input
                id="price"
                name="price"
                type="number"
                min="1"
                step="1"
                value={form.price}
                onChange={handleField}
                className={inputClass(formErrors.price)}
                placeholder="25000"
              />
            </Field>

            <Field
              label="Image URL"
              name="image"
              error={formErrors.image}
              hint={`Must be hosted on ${ALLOWED_IMAGE_HOSTS.join(" or ")}`}
              full
            >
              <input
                id="image"
                name="image"
                value={form.image}
                onChange={handleField}
                className={inputClass(formErrors.image)}
                placeholder="https://images.unsplash.com/photo-..."
              />
            </Field>

            <Field
              label="Image description"
              name="imageAlt"
              error={formErrors.imageAlt}
              hint="Read aloud by screen readers"
              full
            >
              <input
                id="imageAlt"
                name="imageAlt"
                value={form.imageAlt}
                onChange={handleField}
                maxLength={160}
                className={inputClass(formErrors.imageAlt)}
                placeholder="Traditional houseboat on the palm-lined Kerala backwaters"
              />
            </Field>

            <Field
              label="Description"
              name="description"
              error={formErrors.description}
              hint={`${form.description.length}/400`}
              full
            >
              <textarea
                id="description"
                name="description"
                rows={3}
                value={form.description}
                onChange={handleField}
                maxLength={400}
                className={inputClass(formErrors.description)}
                placeholder="Drift through the Alappuzha backwaters on a private houseboat..."
              />
            </Field>
          </div>

          <div className="mt-7 flex flex-wrap gap-3">
            <button
              type="submit"
              disabled={isSaving}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-clay-600 px-7 py-3 text-sm font-medium text-white transition hover:bg-clay-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSaving ? (
                <>
                  <Loader2
                    className="h-4 w-4 animate-spin motion-reduce:animate-none"
                    aria-hidden="true"
                  />
                  Saving...
                </>
              ) : mode === "create" ? (
                "Add destination"
              ) : (
                "Save changes"
              )}
            </button>

            <button
              type="button"
              onClick={closeForm}
              className="rounded-full border border-forest-600 px-6 py-3 text-sm font-medium text-forest-100 transition hover:bg-forest-800"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {loadError && (
        <div className="mt-6 rounded-2xl border border-clay-500/50 bg-clay-900/40 p-6 text-sm text-clay-200">
          <p className="flex items-start gap-3">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            {loadError}
          </p>
          <button
            type="button"
            onClick={() => {
              setLoadError("");
              refresh();
            }}
            className="mt-4 rounded-full border border-clay-400/60 px-5 py-2 text-xs font-medium text-clay-100 transition hover:bg-clay-900/60"
          >
            Try again
          </button>
        </div>
      )}

      {isLoading && destinations.length === 0 ? (
        <p className="mt-8 flex items-center gap-2 text-sm text-forest-300">
          <Loader2
            className="h-4 w-4 animate-spin motion-reduce:animate-none"
            aria-hidden="true"
          />
          Loading destinations...
        </p>
      ) : (
        <ul className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {destinations.map((destination) => (
            <li
              key={destination.id}
              className="flex flex-col overflow-hidden rounded-2xl border border-forest-700 bg-forest-800/30"
            >
              <div className="relative aspect-[16/9] bg-forest-900">
                <Image
                  src={destination.image}
                  alt={destination.imageAlt}
                  fill
                  sizes="(min-width: 1280px) 20rem, (min-width: 640px) 45vw, 90vw"
                  className="object-cover"
                />
              </div>

              <div className="flex flex-1 flex-col p-5">
                <div className="flex items-start justify-between gap-3">
                  <h3 className="font-serif text-lg leading-snug text-bone">
                    {destination.name}
                  </h3>
                  <span className="shrink-0 rounded-full border border-forest-600 px-2.5 py-1 text-[0.6875rem] text-forest-200">
                    {CATEGORY_LABELS[destination.category] ?? destination.category}
                  </span>
                </div>

                <p className="mt-1.5 flex items-center gap-1.5 text-xs text-forest-300">
                  <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
                  {destination.country}
                </p>

                <p className="mt-3 flex-1 text-sm leading-relaxed text-forest-200">
                  {destination.description}
                </p>

                <p className="mt-4 text-sm font-medium text-clay-300">
                  From {formatPrice(destination.price)}
                </p>

                <div className="mt-4 flex items-center gap-2 border-t border-forest-800 pt-4">
                  {confirmingId === destination.id ? (
                    <>
                      <span className="text-xs text-clay-200">Delete this?</span>
                      <button
                        type="button"
                        onClick={() => handleDelete(destination)}
                        disabled={deletingId === destination.id}
                        className="inline-flex items-center gap-1.5 rounded-full bg-clay-600 px-3.5 py-1.5 text-xs font-medium text-white transition hover:bg-clay-700 disabled:opacity-60"
                      >
                        {deletingId === destination.id && (
                          <Loader2
                            className="h-3 w-3 animate-spin motion-reduce:animate-none"
                            aria-hidden="true"
                          />
                        )}
                        Yes, delete
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmingId(null)}
                        className="rounded-full border border-forest-600 px-3.5 py-1.5 text-xs text-forest-100 transition hover:bg-forest-800"
                      >
                        Cancel
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => openEdit(destination)}
                        className="inline-flex items-center gap-1.5 rounded-full border border-forest-600 px-3.5 py-1.5 text-xs font-medium text-forest-100 transition hover:bg-forest-800"
                      >
                        <Pencil className="h-3 w-3" aria-hidden="true" />
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setConfirmingId(destination.id);
                          setNotice("");
                        }}
                        className="inline-flex items-center gap-1.5 rounded-full border border-clay-600/60 px-3.5 py-1.5 text-xs font-medium text-clay-200 transition hover:bg-clay-900/40"
                      >
                        <Trash2 className="h-3 w-3" aria-hidden="true" />
                        Delete
                      </button>
                    </>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

const inputBase =
  "w-full rounded-lg border bg-forest-900/60 px-4 py-3 text-sm text-bone outline-none transition [color-scheme:dark] placeholder:text-forest-400 focus:ring-2 focus:ring-forest-400/30";

function inputClass(hasError) {
  return `${inputBase} ${
    hasError ? "border-clay-400" : "border-forest-700 focus:border-forest-400"
  }`;
}

function Field({ label, name, error, hint, full = false, children }) {
  return (
    <div className={full ? "sm:col-span-2" : ""}>
      <label
        htmlFor={name}
        className="flex items-baseline justify-between gap-3 text-sm font-medium text-forest-100"
      >
        {label}
        {hint && !error && (
          <span className="text-xs font-normal text-forest-400">{hint}</span>
        )}
      </label>

      <div className="mt-2">{children}</div>

      {error && (
        <p
          id={`${name}-error`}
          className="mt-2 flex items-start gap-1.5 text-xs text-clay-300"
        >
          <AlertCircle className="mt-0.5 h-3 w-3 shrink-0" aria-hidden="true" />
          {error}
        </p>
      )}
    </div>
  );
}
