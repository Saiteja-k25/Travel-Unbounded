import { MapPin } from "lucide-react";
import Container from "./Container";
import { offices } from "@/data/offices";

export default function OfficeLocations() {
  return (
    <section className="py-20 sm:py-28 lg:py-32">
      <Container>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-clay-700">
          Our locations
        </p>
        <h2 className="mt-3 max-w-2xl font-serif text-3xl leading-tight text-forest-800 sm:text-4xl">
          Three offices, two continents
        </h2>

        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {offices.map((office) => (
            <article
              key={office.id}
              className="rounded-2xl border border-sand bg-white p-7"
            >
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-clay-50 text-clay-700">
                <MapPin className="h-5 w-5" aria-hidden="true" />
              </span>

              <h3 className="mt-5 font-serif text-xl text-forest-800">
                {office.city}
              </h3>
              <p className="text-xs font-medium uppercase tracking-widest text-clay-700">
                {office.label}
              </p>

              <address className="mt-4 space-y-1 text-sm not-italic leading-relaxed text-ink-soft">
                {office.addressLines.map((line) => (
                  <p key={line}>{line}</p>
                ))}
              </address>
            </article>
          ))}
        </div>
      </Container>
    </section>
  );
}
