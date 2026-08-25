import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import Container from "./Container";

const stats = [
  { value: "12+", label: "Years planning journeys" },
  { value: "40+", label: "Destinations covered" },
  { value: "3", label: "Offices, two continents" },
  { value: "24x7", label: "On-trip support" },
];

export default function Hero() {
  return (
    <section className="relative z-10 flex min-h-[92vh] items-end overflow-hidden">
      <Image
        src="https://images.unsplash.com/photo-1585573552022-3889a9edeca2?auto=format&fit=crop&w=2000&q=70"
        alt="Snow-capped mountain range at first light"
        fill
        priority
        sizes="100vw"
        className="object-cover"
      />

      {/* Two overlays: a vertical fade for text contrast, and a warm tint so
          the photo sits inside the site palette instead of fighting it. */}
      <div className="absolute inset-0 bg-gradient-to-t from-forest-900 from-15% via-forest-900/70 to-forest-900/20" />
      <div className="absolute inset-0 bg-clay-900/10 mix-blend-multiply" />

      <Container className="relative pb-16 pt-40 sm:pb-24 sm:pt-48">
        <div className="flex items-center gap-4">
          <span className="h-px w-10 bg-clay-300" aria-hidden="true" />
          <p className="text-[0.7rem] font-semibold uppercase tracking-[0.25em] text-clay-300">
            Experiential travel since 2013
          </p>
        </div>

        <h1 className="mt-8 max-w-4xl font-serif text-[2.75rem] leading-[1.05] text-bone sm:text-6xl lg:text-7xl">
          Journeys built around
          <span className="block text-clay-200">the people taking them</span>
        </h1>

        <p className="mt-8 max-w-xl text-base leading-relaxed text-forest-100 sm:text-lg">
          Handcrafted expeditions across Kerala&rsquo;s backwaters, Ladakh&rsquo;s
          high passes, the Masai Mara and beyond. Every route personally
          travelled by our team before it reaches you.
        </p>

        <Link
          href="/contact"
          className="mt-12 inline-flex items-center gap-2.5 rounded-full bg-clay-600 px-8 py-4 text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-white transition hover:bg-clay-700"
        >
          Plan Your Trip
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>

        <dl className="mt-20 grid grid-cols-2 gap-x-8 gap-y-10 border-t border-bone/20 pt-10 sm:grid-cols-4">
          {stats.map((stat) => (
            <div key={stat.label}>
              <dt className="font-serif text-3xl text-bone sm:text-4xl">
                {stat.value}
              </dt>
              <dd className="mt-2 text-xs leading-snug text-forest-200 sm:text-sm">
                {stat.label}
              </dd>
            </div>
          ))}
        </dl>
      </Container>
    </section>
  );
}
