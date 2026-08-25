// Wordmark: "TRAVEL" and "UNBOUNDED" stacked in a bold uppercase sans, with an
// infinity mark sitting to the right of the first line. Drawn as inline SVG so
// it stays sharp at any size and needs no image file.
//
// `tone` switches the text colour for dark surfaces (footer, menu panel).
export default function Logo({ tone = "dark", className = "" }) {
  const primary = tone === "light" ? "text-bone" : "text-forest-800";
  const secondary = tone === "light" ? "text-forest-300" : "text-ink-soft";

  return (
    <span
      className={`inline-flex flex-col leading-none ${className}`}
      role="img"
      aria-label="Travel Unbounded"
    >
      <span className="flex items-center gap-2">
        <span
          className={`text-sm font-bold uppercase tracking-[0.16em] sm:text-base ${primary}`}
        >
          Travel
        </span>

        <svg
          viewBox="0 0 48 24"
          className="h-3.5 w-7 shrink-0 sm:h-4 sm:w-8"
          aria-hidden="true"
          focusable="false"
        >
          <defs>
            <linearGradient id="tu-mark" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#3f7f63" />
              <stop offset="50%" stopColor="#5f9c81" />
              <stop offset="100%" stopColor="#d26e4a" />
            </linearGradient>
          </defs>

          {/* Two overlapping rings form a clean, symmetrical lemniscate. */}
          <circle
            cx="14.5"
            cy="12"
            r="8.5"
            fill="none"
            stroke="url(#tu-mark)"
            strokeWidth="4"
          />
          <circle
            cx="33.5"
            cy="12"
            r="8.5"
            fill="none"
            stroke="url(#tu-mark)"
            strokeWidth="4"
          />
        </svg>
      </span>

      <span
        className={`mt-1.5 text-sm font-bold uppercase tracking-[0.16em] sm:text-base ${secondary}`}
      >
        Unbounded
      </span>
    </span>
  );
}
