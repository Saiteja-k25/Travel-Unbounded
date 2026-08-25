import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import Container from "./Container";

const stats = [
  { value: "12+", label: "Years planning journeys" },
  { value: "40+", label: "Destinations covered" },
  { value: "3", label: "Offices across two continents" },
  { value: "24x7", label: "On-trip support" },
];

export default function Hero() {
  return (
    <section className="relative isolate flex min-h-[88vh] items-end overflow-hidden">
      <Image
        src="https://images.unsplash.com/photo-1585573552022-3889a9edeca2?auto=format&fit=crop&w=2000&q=70"
        alt="Snow-capped mountain range at first light"
        fill
        priority
        sizes="100vw"
        className="object-cover"
      />

      {/* Two overlays: a vertical fade for text contrast, and a warm tint so the
          photo sits inside the site palette instead of fighting it. */}
      <div className="absolute inset-0 bg-gradient-to-t from-forest-900 via-forest-900/70 to-forest-900/25" />
      <div className="absolute inset-0 bg-clay-900/10 mix-blend-multiply" />

      <Container className="relative pb-14 pt-32 sm:pb-20">
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-clay-300">
          Experiential travel since 2013
        </p>

        <h1 className="mt-5 max-w-4xl font-serif text-4xl leading-[1.1] text-bone sm:text-6xl lg:text-7xl">
          India&rsquo;s most trusted
          <span className="block text-clay-200">experiential travel experts</span>
        </h1>

        <p className="mt-6 max-w-xl text-base leading-relaxed text-forest-100 sm:text-lg">
          The best journeys aren&rsquo;t sold from a catalogue. They&rsquo;re
          built around the people taking them &mdash; every resort, route and
          guide personally experienced by our team first.
        </p>

        <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:gap-4">
          <Link
            href="/contact"
            className="inline-flex items-center justify-center gap-2 rounded-full bg-clay-600 px-7 py-3.5 font-medium text-white transition hover:bg-clay-700"
          >
            Plan Your Trip
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
          <Link
            href="#india"
            className="inline-flex items-center justify-center rounded-full border border-bone/40 px-7 py-3.5 font-medium text-bone backdrop-blur-sm transition hover:bg-bone/10"
          >
            Browse Destinations
          </Link>
        </div>

        <dl className="mt-14 grid grid-cols-2 gap-x-6 gap-y-8 border-t border-bone/20 pt-8 sm:grid-cols-4">
          {stats.map((stat) => (
            <div key={stat.label}>
              <dt className="font-serif text-3xl text-bone sm:text-4xl">
                {stat.value}
              </dt>
              <dd className="mt-1 text-xs leading-snug text-forest-200 sm:text-sm">
                {stat.label}
              </dd>
            </div>
          ))}
        </dl>
      </Container>
    </section>
  );
}
