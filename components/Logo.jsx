// Text wordmark with an infinity mark, drawn as inline SVG so it stays sharp
// at any size and needs no image file. `tone` switches the text colour for
// dark backgrounds (footer, mobile drawer) versus light ones (navbar).
export default function Logo({ tone = "dark", className = "" }) {
  const textColor = tone === "light" ? "text-bone" : "text-forest-800";
  const subColor = tone === "light" ? "text-forest-200" : "text-ink-soft";

  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <svg
        viewBox="0 0 40 24"
        className="h-6 w-10 shrink-0 sm:h-7 sm:w-11"
        role="img"
        aria-label="Travel Unbounded"
      >
        <defs>
          <linearGradient id="tu-infinity" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#e08a6b" />
            <stop offset="45%" stopColor="#d26e4a" />
            <stop offset="100%" stopColor="#3f7f63" />
          </linearGradient>
        </defs>
        <path
          d="M6 12c0-3.4 2.4-5.6 5-5.6 2.2 0 3.9 1.6 5 3.4l4 6.4c1.1 1.8 2.8 3.4 5 3.4 2.6 0 5-2.2 5-5.6s-2.4-5.6-5-5.6c-2.2 0-3.9 1.6-5 3.4l-4 6.4c-1.1 1.8-2.8 3.4-5 3.4-2.6 0-5-2.2-5-5.6Z"
          fill="none"
          stroke="url(#tu-infinity)"
          strokeWidth="3.2"
          strokeLinecap="round"
        />
      </svg>

      <span className="leading-none">
        <span
          className={`block text-[0.7rem] font-semibold uppercase tracking-[0.18em] sm:text-xs ${textColor}`}
        >
          Travel
        </span>
        <span
          className={`mt-0.5 block text-[0.7rem] font-semibold uppercase tracking-[0.18em] sm:text-xs ${subColor}`}
        >
          Unbounded
        </span>
      </span>
    </span>
  );
}
