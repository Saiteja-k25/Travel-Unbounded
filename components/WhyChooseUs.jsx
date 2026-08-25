import { Compass, Map, ShieldCheck, Users } from "lucide-react";
import Container from "./Container";

const values = [
  {
    icon: Compass,
    title: "Personally vetted",
    description:
      "Every resort, route and activity we recommend has been travelled by someone on our team first. Nothing is sold from a brochure.",
  },
  {
    icon: Users,
    title: "Local guides",
    description:
      "We work with the same naturalists, drivers and hosts year after year, so you get the version of a place that residents know.",
  },
  {
    icon: Map,
    title: "Custom itineraries",
    description:
      "Trips are built around your pace, your budget and the people travelling with you, not around a fixed departure calendar.",
  },
  {
    icon: ShieldCheck,
    title: "24x7 on-trip support",
    description:
      "Weather turns, flights move. A real person from our team is reachable at any hour for the length of your journey.",
  },
];

export default function WhyChooseUs() {
  return (
    <section className="bg-sand/40 py-20 sm:py-28 lg:py-32">
      <Container>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-clay-700">
          Why choose us
        </p>
        <h2 className="mt-3 max-w-2xl font-serif text-3xl leading-tight text-forest-800 sm:text-4xl">
          Four things we refuse to outsource
        </h2>

        <div className="mt-12 grid gap-6 sm:grid-cols-2">
          {values.map((value) => {
            const Icon = value.icon;
            return (
              <article
                key={value.title}
                className="rounded-2xl border border-sand bg-white p-7"
              >
                <span className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-forest-50 text-forest-700">
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <h3 className="mt-5 font-serif text-xl text-forest-800">
                  {value.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-soft">
                  {value.description}
                </p>
              </article>
            );
          })}
        </div>
      </Container>
    </section>
  );
}
