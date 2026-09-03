"use client";

import { useState } from "react";
import { Check, Copy, MapPin, Sparkles, Wallet } from "lucide-react";

// Renders an itinerary returned by /api/chat as day-by-day cards.
//
// The assignment asks for the plan to appear as cards rather than raw text, so
// this component owns that layout and the chat widget just hands it the
// itinerary object.
//
// Every field is already normalised server-side by normaliseAiReply in
// lib/chatPrompt.js: `days` is guaranteed to be a non-empty array, each day has
// all four keys, and days are numbered 1..n. The optional header fields can
// still be null, so those are guarded here.

// Flattens the itinerary into plain text for the clipboard. Mirrors what is on
// screen, in reading order.
function toPlainText(itinerary) {
  const lines = [itinerary.title];

  if (itinerary.destination) lines.push(itinerary.destination);
  if (itinerary.summary) lines.push("", itinerary.summary);
  if (itinerary.estimatedCost) {
    lines.push(
      "",
      `Estimated: ${itinerary.estimatedCost} (rough estimate only - our team confirms final pricing)`
    );
  }

  lines.push("");

  for (const day of itinerary.days) {
    lines.push(`Day ${day.day} - ${day.title}`);
    lines.push(day.activity);
    if (day.highlight) lines.push(`Highlight: ${day.highlight}`);
    lines.push("");
  }

  lines.push("Planned with Sarathi at Travel Unbounded");

  return lines.join("\n");
}

export default function ItineraryCards({ itinerary }) {
  const [hasCopied, setHasCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(toPlainText(itinerary));
      setHasCopied(true);
      // Revert the button after a moment so it can be used again.
      setTimeout(() => setHasCopied(false), 2000);
    } catch {
      // The Clipboard API needs a secure context and permission. If it is
      // unavailable there is nothing useful to tell the visitor, and the
      // itinerary is still readable on screen, so fail quietly.
    }
  }

  return (
    <div className="mt-3 rounded-2xl border border-sand bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-serif text-lg leading-snug text-forest-800">
            {itinerary.title}
          </h3>

          {itinerary.destination && (
            <p className="mt-1 flex items-center gap-1.5 text-xs text-ink-soft">
              <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span className="truncate">{itinerary.destination}</span>
            </p>
          )}
        </div>

        <button
          type="button"
          onClick={handleCopy}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-sand px-3 py-1.5 text-xs font-medium text-ink-soft transition hover:bg-sand/50"
        >
          {hasCopied ? (
            <>
              <Check className="h-3.5 w-3.5" aria-hidden="true" />
              Copied
            </>
          ) : (
            <>
              <Copy className="h-3.5 w-3.5" aria-hidden="true" />
              Copy
            </>
          )}
        </button>
      </div>

      {itinerary.summary && (
        <p className="mt-3 text-sm leading-relaxed text-ink-soft">
          {itinerary.summary}
        </p>
      )}

      {/* The figure is the AI's own approximation, not a quote from Travel
          Unbounded, so it is always labelled as such. Without the caption a
          visitor could reasonably read it as a price the company has offered. */}
      {itinerary.estimatedCost && (
        <div className="mt-3">
          <p className="inline-flex items-center gap-1.5 rounded-full bg-forest-50 px-3 py-1.5 text-xs font-medium text-forest-700">
            <Wallet className="h-3.5 w-3.5" aria-hidden="true" />
            {itinerary.estimatedCost}
          </p>
          <p className="mt-1.5 text-[0.6875rem] leading-snug text-ink-soft">
            Rough estimate only. Our team confirms final pricing.
          </p>
        </div>
      )}

      <ol className="mt-4 space-y-3">
        {itinerary.days.map((day) => (
          <li
            key={day.day}
            className="rounded-xl border border-sand bg-bone/60 p-3.5"
          >
            <div className="flex items-center gap-2.5">
              <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-forest-700 text-xs font-semibold text-white">
                {day.day}
              </span>
              <h4 className="text-sm font-semibold leading-snug text-forest-800">
                {day.title}
              </h4>
            </div>

            <p className="mt-2.5 text-sm leading-relaxed text-ink-soft">
              {day.activity}
            </p>

            {day.highlight && (
              <p className="mt-2.5 flex items-start gap-1.5 text-xs text-clay-700">
                <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                <span>{day.highlight}</span>
              </p>
            )}
          </li>
        ))}
      </ol>
    </div>
  );
}
