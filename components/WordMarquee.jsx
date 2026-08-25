const words = [
  "Backwaters",
  "High Passes",
  "Migration",
  "Tea Country",
  "Monsoon",
  "Safari",
  "Sunrise",
  "Unbounded",
];

// One continuous line of travel words. The list is rendered twice and the
// track slides by exactly half its width, so the loop is seamless. Hovering
// pauses it (see .marquee-track in globals.css), and each word lifts on hover.
function WordList({ hidden = false }) {
  return (
    <ul
      className="flex shrink-0 items-center"
      aria-hidden={hidden ? "true" : undefined}
    >
      {words.map((word) => (
        <li key={word} className="flex items-center">
          <span className="group cursor-default px-8 font-serif text-[clamp(2.25rem,7vw,5.5rem)] leading-none text-forest-800 transition-colors duration-300 hover:text-clay-600">
            {word}
          </span>
          <span
            className="h-2.5 w-2.5 shrink-0 rounded-full bg-clay-400"
            aria-hidden="true"
          />
        </li>
      ))}
    </ul>
  );
}

export default function WordMarquee() {
  return (
    <section
      aria-label="Where we travel"
      className="overflow-hidden border-y border-sand bg-sand/40 py-16 sm:py-20"
    >
      <div className="marquee-track flex w-max">
        <WordList />
        <WordList hidden />
      </div>
    </section>
  );
}
