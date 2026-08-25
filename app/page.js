// TEMPORARY: a swatch/specimen page so we can eyeball the theme.
// This gets replaced by the real home page in the next step.

// NOTE: these class names are written out in full on purpose. Tailwind scans
// source files as text, so a built string like `bg-forest-${step}` would never
// generate any CSS.
const forestShades = [
  "bg-forest-50",
  "bg-forest-100",
  "bg-forest-200",
  "bg-forest-300",
  "bg-forest-400",
  "bg-forest-500",
  "bg-forest-600",
  "bg-forest-700",
  "bg-forest-800",
  "bg-forest-900",
];

const clayShades = [
  "bg-clay-50",
  "bg-clay-100",
  "bg-clay-200",
  "bg-clay-300",
  "bg-clay-400",
  "bg-clay-500",
  "bg-clay-600",
  "bg-clay-700",
  "bg-clay-800",
  "bg-clay-900",
];

function Swatch({ className, label }) {
  return (
    <div className="text-xs">
      <div className={`h-16 rounded-md border border-sand ${className}`} />
      <p className="mt-1 text-ink-soft">{label}</p>
    </div>
  );
}

export default function Home() {
  return (
    <main className="mx-auto w-full max-w-5xl px-6 py-16">
      <h1 className="font-serif text-5xl text-forest-800">Travel Unbounded</h1>
      <p className="mt-3 max-w-xl text-lg text-ink-soft">
        Journeys built around the people taking them. This page is a temporary
        theme specimen.
      </p>

      <h2 className="mt-12 font-serif text-2xl text-ink">Forest (primary)</h2>
      <div className="mt-4 grid grid-cols-5 gap-3 sm:grid-cols-10">
        {forestShades.map((shade) => (
          <Swatch key={shade} className={shade} label={shade.slice(3)} />
        ))}
      </div>

      <h2 className="mt-10 font-serif text-2xl text-ink">Clay (accent)</h2>
      <div className="mt-4 grid grid-cols-5 gap-3 sm:grid-cols-10">
        {clayShades.map((shade) => (
          <Swatch key={shade} className={shade} label={shade.slice(3)} />
        ))}
      </div>

      <h2 className="mt-10 font-serif text-2xl text-ink">Neutrals</h2>
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Swatch className="bg-bone" label="bone (page bg)" />
        <Swatch className="bg-sand" label="sand (surface)" />
        <Swatch className="bg-ink" label="ink (text)" />
        <Swatch className="bg-ink-soft" label="ink-soft (muted)" />
      </div>

      <h2 className="mt-10 font-serif text-2xl text-ink">Type &amp; buttons</h2>
      <p className="mt-4 font-serif text-4xl text-forest-800">
        India&rsquo;s Most Trusted Experiential Travel Experts
      </p>
      <p className="mt-3 max-w-2xl text-ink-soft">
        Body copy is Plus Jakarta Sans. Headings are Fraunces. From spotting the
        Big Five at dawn in the Masai Mara to cruising Ha Long Bay at sunset.
      </p>
      <div className="mt-6 flex flex-wrap gap-4">
        <button className="rounded-full bg-forest-700 px-6 py-3 font-medium text-bone hover:bg-forest-800">
          Plan Your Trip
        </button>
        <button className="rounded-full bg-clay-700 px-6 py-3 font-medium text-bone hover:bg-clay-800">
          Enquire Now
        </button>
        <button className="rounded-full border border-forest-700 px-6 py-3 font-medium text-forest-700 hover:bg-forest-50">
          View Details
        </button>
      </div>
    </main>
  );
}
