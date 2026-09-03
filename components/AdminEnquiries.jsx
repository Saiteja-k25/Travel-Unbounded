"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Inbox,
  Loader2,
  Search,
} from "lucide-react";
import { adminJson } from "@/lib/adminApi";
import { ENQUIRY_STATUSES } from "@/lib/validateEnquiry";

// The enquiries table.
//
// Filtering, searching and paging all happen on the SERVER, not by loading
// every enquiry and filtering in the browser. With two rows that makes no
// difference; with two thousand it is the difference between a usable page and
// shipping the entire customer list to the client on every visit.

const SEARCH_DEBOUNCE_MS = 350;

// Colours per status, so a glance at the table reads as progress.
const STATUS_STYLES = {
  New: "border-clay-400/50 bg-clay-500/15 text-clay-200",
  Contacted: "border-forest-400/50 bg-forest-500/20 text-forest-100",
  Converted: "border-emerald-400/50 bg-emerald-500/15 text-emerald-200",
  Closed: "border-forest-600 bg-forest-800 text-forest-300",
};

function formatDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatDateTime(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function travellers(enquiry) {
  const adults = enquiry.numberOfPeople ?? 0;
  const children = enquiry.numberOfChildren ?? 0;
  return children > 0 ? `${adults} + ${children} child` : String(adults);
}

export default function AdminEnquiries() {
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  // Which row is mid-update, so only that dropdown shows a spinner.
  const [savingId, setSavingId] = useState(null);
  const [saveError, setSaveError] = useState("");

  // Debounce the search box so typing does not fire a request per keystroke.
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1); // A new search starts from the first page.
    }, SEARCH_DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [searchInput]);

  // Bumped to re-run the fetch without changing any filter - after a status
  // update, or when the retry button is pressed.
  const [reloadKey, setReloadKey] = useState(0);

  // The effect deliberately sets no state synchronously. Doing so inside an
  // effect body triggers a second render pass before the browser paints, which
  // React flags as a cascading render. Everything here is set from a promise
  // callback instead, and the loading flag is raised by the handlers that
  // change a filter - those are events, where synchronous updates are correct.
  useEffect(() => {
    let active = true;

    const params = new URLSearchParams({ page: String(page), limit: "20" });
    if (statusFilter !== "all") params.set("status", statusFilter);
    if (search) params.set("search", search);

    adminJson(`/api/enquiries?${params.toString()}`)
      .then((result) => {
        if (!active) return;
        setData(result);
        setError("");
      })
      .catch((caught) => {
        if (!active) return;
        setError(caught?.message ?? "Could not load enquiries.");
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    // Marks this request stale if the filters change before it returns, so a
    // slow earlier response cannot overwrite a newer one. Easy to trigger by
    // typing quickly in the search box.
    return () => {
      active = false;
    };
  }, [page, search, statusFilter, reloadKey]);

  const refresh = useCallback(() => {
    setIsLoading(true);
    setReloadKey((current) => current + 1);
  }, []);

  async function handleStatusChange(enquiry, nextStatus) {
    if (nextStatus === enquiry.status) return;

    setSavingId(enquiry.id);
    setSaveError("");

    try {
      await adminJson(`/api/enquiry/${enquiry.id}`, {
        method: "PATCH",
        body: JSON.stringify({ status: nextStatus }),
      });

      // Refetch rather than patching state locally: the counts on the filter
      // tabs change too, and a filtered view may no longer include this row.
      refresh();
    } catch (caught) {
      setSaveError(
        caught?.message ?? "Could not update that enquiry. Please try again."
      );
    } finally {
      setSavingId(null);
    }
  }

  const counts = data?.counts ?? {};
  const pagination = data?.pagination;
  const enquiries = data?.enquiries ?? [];

  const tabs = useMemo(
    () => [
      { value: "all", label: "All" },
      ...ENQUIRY_STATUSES.map((status) => ({ value: status, label: status })),
    ],
    []
  );

  return (
    <section>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="font-serif text-2xl text-bone sm:text-3xl">Enquiries</h2>
          <p className="mt-2 text-sm text-forest-300">
            {pagination
              ? `${pagination.total} enquir${pagination.total === 1 ? "y" : "ies"}${
                  statusFilter !== "all" || search ? " matching" : " in total"
                }`
              : " "}
          </p>
        </div>

        <div className="relative w-full sm:w-72">
          <label htmlFor="enquiry-search" className="sr-only">
            Search enquiries by name or email
          </label>
          <Search
            className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-forest-400"
            aria-hidden="true"
          />
          <input
            id="enquiry-search"
            type="search"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder="Search name or email"
            maxLength={80}
            className="w-full rounded-full border border-forest-700 bg-forest-900/60 py-2.5 pl-10 pr-4 text-sm text-bone outline-none transition placeholder:text-forest-400 focus:border-forest-400"
          />
        </div>
      </div>

      {/* Status filter tabs. Counts come from the whole collection, not the
          filtered set, so they still show where everything is. */}
      <div className="mt-6 flex flex-wrap gap-2">
        {tabs.map((tab) => {
          const isActive = statusFilter === tab.value;
          const count = counts[tab.value];

          return (
            <button
              key={tab.value}
              type="button"
              aria-pressed={isActive}
              onClick={() => {
                setIsLoading(true);
                setStatusFilter(tab.value);
                setPage(1);
              }}
              className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-medium transition ${
                isActive
                  ? "border-clay-500 bg-clay-600 text-white"
                  : "border-forest-700 bg-forest-800/40 text-forest-200 hover:bg-forest-800"
              }`}
            >
              {tab.label}
              {count !== undefined && (
                <span
                  className={`rounded-full px-1.5 py-0.5 text-[0.6875rem] ${
                    isActive ? "bg-clay-700/70" : "bg-forest-900/70"
                  }`}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {saveError && (
        <p
          role="alert"
          className="mt-5 flex items-start gap-3 rounded-lg border border-clay-500/50 bg-clay-900/40 p-4 text-sm text-clay-200"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          {saveError}
        </p>
      )}

      {error ? (
        <div className="mt-6 rounded-2xl border border-clay-500/50 bg-clay-900/40 p-6 text-sm text-clay-200">
          <p className="flex items-start gap-3">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            {error}
          </p>
          <button
            type="button"
            onClick={refresh}
            className="mt-4 rounded-full border border-clay-400/60 px-5 py-2 text-xs font-medium text-clay-100 transition hover:bg-clay-900/60"
          >
            Try again
          </button>
        </div>
      ) : isLoading && !data ? (
        <p className="mt-8 flex items-center gap-2 text-sm text-forest-300">
          <Loader2
            className="h-4 w-4 animate-spin motion-reduce:animate-none"
            aria-hidden="true"
          />
          Loading enquiries...
        </p>
      ) : enquiries.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-forest-700 bg-forest-800/30 p-10 text-center">
          <Inbox
            className="mx-auto h-8 w-8 text-forest-500"
            aria-hidden="true"
          />
          <p className="mt-4 text-sm text-forest-200">
            {search || statusFilter !== "all"
              ? "No enquiries match this filter."
              : "No enquiries yet."}
          </p>
          {(search || statusFilter !== "all") && (
            <button
              type="button"
              onClick={() => {
                setIsLoading(true);
                setSearchInput("");
                setStatusFilter("all");
                setPage(1);
              }}
              className="mt-4 rounded-full border border-forest-600 px-5 py-2 text-xs font-medium text-forest-100 transition hover:bg-forest-800"
            >
              Clear filters
            </button>
          )}
        </div>
      ) : (
        <>
          {/* Desktop: a real table. Wrapped in its own horizontal scroller so a
              wide table never makes the whole page scroll sideways. */}
          <div className="mt-6 hidden overflow-x-auto rounded-2xl border border-forest-700 lg:block">
            <table className="w-full min-w-[60rem] border-collapse text-sm">
              <thead>
                <tr className="bg-forest-800 text-left text-xs uppercase tracking-wider text-forest-300">
                  <th scope="col" className="px-5 py-3.5 font-medium">Name</th>
                  <th scope="col" className="px-5 py-3.5 font-medium">Contact</th>
                  <th scope="col" className="px-5 py-3.5 font-medium">Travel date</th>
                  <th scope="col" className="px-5 py-3.5 font-medium">People</th>
                  <th scope="col" className="px-5 py-3.5 font-medium">Hotel</th>
                  <th scope="col" className="px-5 py-3.5 font-medium">Received</th>
                  <th scope="col" className="px-5 py-3.5 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {enquiries.map((enquiry) => (
                  <tr
                    key={enquiry.id}
                    className="border-t border-forest-800 align-top transition hover:bg-forest-800/40"
                  >
                    <td className="px-5 py-4">
                      <p className="font-medium text-bone">{enquiry.fullName}</p>
                      {enquiry.destination && (
                        <p className="mt-1 text-xs text-clay-300">
                          {enquiry.destination}
                          {enquiry.tripDurationNights
                            ? ` · ${enquiry.tripDurationNights} nights`
                            : ""}
                        </p>
                      )}
                    </td>
                    <td className="px-5 py-4 text-forest-200">
                      <a
                        href={`mailto:${enquiry.email}`}
                        className="block hover:text-bone hover:underline"
                      >
                        {enquiry.email}
                      </a>
                      <a
                        href={`tel:${enquiry.countryCode}${enquiry.contactNumber}`}
                        className="mt-1 block text-xs text-forest-300 hover:text-bone"
                      >
                        {enquiry.countryCode} {enquiry.contactNumber}
                      </a>
                    </td>
                    <td className="px-5 py-4 text-forest-200">
                      {formatDate(enquiry.dateOfTravel)}
                    </td>
                    <td className="px-5 py-4 text-forest-200">
                      {travellers(enquiry)}
                    </td>
                    <td className="px-5 py-4 text-forest-200">
                      {enquiry.hotelCategory}
                    </td>
                    <td className="px-5 py-4 text-xs text-forest-300">
                      {formatDateTime(enquiry.createdAt)}
                    </td>
                    <td className="px-5 py-4">
                      <StatusSelect
                        enquiry={enquiry}
                        isSaving={savingId === enquiry.id}
                        onChange={handleStatusChange}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile and tablet: one card per enquiry. A seven-column table is
              unusable on a phone, and the assignment asks for the dashboard to
              be fully responsive. */}
          <ul className="mt-6 space-y-3 lg:hidden">
            {enquiries.map((enquiry) => (
              <li
                key={enquiry.id}
                className="rounded-2xl border border-forest-700 bg-forest-800/30 p-5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium text-bone">{enquiry.fullName}</p>
                    <a
                      href={`mailto:${enquiry.email}`}
                      className="mt-0.5 block truncate text-sm text-forest-200 hover:underline"
                    >
                      {enquiry.email}
                    </a>
                    <a
                      href={`tel:${enquiry.countryCode}${enquiry.contactNumber}`}
                      className="mt-0.5 block text-xs text-forest-300"
                    >
                      {enquiry.countryCode} {enquiry.contactNumber}
                    </a>
                  </div>
                  <StatusBadge status={enquiry.status} />
                </div>

                <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2.5 text-xs">
                  <div>
                    <dt className="text-forest-400">Travel date</dt>
                    <dd className="mt-0.5 text-forest-100">
                      {formatDate(enquiry.dateOfTravel)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-forest-400">People</dt>
                    <dd className="mt-0.5 text-forest-100">{travellers(enquiry)}</dd>
                  </div>
                  <div>
                    <dt className="text-forest-400">Hotel</dt>
                    <dd className="mt-0.5 text-forest-100">{enquiry.hotelCategory}</dd>
                  </div>
                  <div>
                    <dt className="text-forest-400">Received</dt>
                    <dd className="mt-0.5 text-forest-100">
                      {formatDate(enquiry.createdAt)}
                    </dd>
                  </div>
                  {enquiry.destination && (
                    <div className="col-span-2">
                      <dt className="text-forest-400">Destination</dt>
                      <dd className="mt-0.5 text-clay-300">
                        {enquiry.destination}
                        {enquiry.tripDurationNights
                          ? ` · ${enquiry.tripDurationNights} nights`
                          : ""}
                      </dd>
                    </div>
                  )}
                </dl>

                <div className="mt-4 border-t border-forest-800 pt-4">
                  <StatusSelect
                    enquiry={enquiry}
                    isSaving={savingId === enquiry.id}
                    onChange={handleStatusChange}
                    fullWidth
                  />
                </div>
              </li>
            ))}
          </ul>

          {pagination && pagination.pageCount > 1 && (
            <div className="mt-6 flex items-center justify-between gap-4">
              <button
                type="button"
                onClick={() => {
                  setIsLoading(true);
                  setPage((current) => Math.max(1, current - 1));
                }}
                disabled={page <= 1 || isLoading}
                className="inline-flex items-center gap-1.5 rounded-full border border-forest-700 px-4 py-2 text-xs font-medium text-forest-100 transition hover:bg-forest-800 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ChevronLeft className="h-3.5 w-3.5" aria-hidden="true" />
                Previous
              </button>

              <p className="text-xs text-forest-300" aria-live="polite">
                Page {pagination.page} of {pagination.pageCount}
              </p>

              <button
                type="button"
                onClick={() => {
                  setIsLoading(true);
                  setPage((current) =>
                    Math.min(pagination.pageCount, current + 1)
                  );
                }}
                disabled={page >= pagination.pageCount || isLoading}
                className="inline-flex items-center gap-1.5 rounded-full border border-forest-700 px-4 py-2 text-xs font-medium text-forest-100 transition hover:bg-forest-800 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Next
                <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            </div>
          )}
        </>
      )}
    </section>
  );
}

function StatusBadge({ status }) {
  return (
    <span
      className={`shrink-0 rounded-full border px-2.5 py-1 text-[0.6875rem] font-medium ${
        STATUS_STYLES[status] ?? STATUS_STYLES.Closed
      }`}
    >
      {status}
    </span>
  );
}

function StatusSelect({ enquiry, isSaving, onChange, fullWidth = false }) {
  return (
    <div className={`flex items-center gap-2 ${fullWidth ? "w-full" : ""}`}>
      <label htmlFor={`status-${enquiry.id}`} className="sr-only">
        Status for {enquiry.fullName}
      </label>
      <select
        id={`status-${enquiry.id}`}
        value={enquiry.status}
        disabled={isSaving}
        onChange={(event) => onChange(enquiry, event.target.value)}
        className={`rounded-lg border border-forest-700 bg-forest-900/60 px-3 py-2 text-xs text-bone outline-none transition [color-scheme:dark] focus:border-forest-400 disabled:opacity-60 ${
          fullWidth ? "w-full" : ""
        }`}
      >
        {ENQUIRY_STATUSES.map((status) => (
          <option key={status} value={status}>
            {status}
          </option>
        ))}
      </select>

      {isSaving && (
        <Loader2
          className="h-3.5 w-3.5 shrink-0 animate-spin text-forest-300 motion-reduce:animate-none"
          aria-hidden="true"
        />
      )}
    </div>
  );
}
