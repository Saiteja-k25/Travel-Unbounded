import Image from "next/image";
import { CalendarCheck, Luggage, Tent } from "lucide-react";
import Container from "./Container";

const notes = [
  {
    icon: CalendarCheck,
    title: "Go in shoulder season",
    description:
      "The month either side of peak gives you the same landscape with a fraction of the crowd, and better rates on the good lodges.",
  },
  {
    icon: Luggage,
    title: "Pack in layers, not bulk",
    description:
      "Ladakh swings twenty degrees in a day. Three thin layers beat one heavy coat every time, and they fit in carry-on.",
  },
  {
    icon: Tent,
    title: "Leave a day unplanned",
    description:
      "The best mornings on any trip are the unscheduled ones. We build at least one into every itinerary on purpose.",
  },
];

export default function TravelNotes() {
  return (
    // Pulled up under the hero and given a lower stacking order, so the band
    // starts behind the hero's solid forest-900 base. There is no seam to see:
    // the dark top of this band is the same colour the hero ends on, and the
    // photograph simply emerges out of it as you scroll.
    <section className="relative z-0 -mt-24 bg-forest-900 sm:-mt-32">
      {/* Clipped with clip-path rather than overflow-hidden on purpose:
          overflow-hidden would make this a scroll container, and the
          scroll-driven reveal below needs the page itself as its timeline. */}
      <div className="relative h-[78vh] min-h-[420px] w-full [clip-path:inset(0)]">
        <Image
          src="https://images.unsplash.com/photo-1454105511235-eda89ad84214?auto=format&fit=crop&w=2000&q=70"
          alt="Fog drifting through a forest of tall pines at dawn"
          fill
          sizes="100vw"
          className="band-reveal object-cover"
        />

        {/* Top: continues the hero's darkness, then dissolves into the photo. */}
        <div className="fade-out-of-forest absolute inset-x-0 top-0 h-3/5" />

        {/* Bottom: a long, eased dissolve into the cream page below, so the
            photograph has no edge - it simply runs out. */}
        <div className="fade-into-bone absolute inset-x-0 bottom-0 h-[65%]" />
      </div>

      {/* Everything below the band sits on the cream page again. */}
      <div className="bg-bone">
        <Container className="pb-20 pt-10 text-center sm:pb-28 lg:pb-32">
          <p className="text-[0.7rem] font-semibold uppercase tracking-[0.22em] text-clay-700">
            Travel notes
          </p>
          <h2 className="mx-auto mt-4 max-w-3xl font-serif text-3xl leading-[1.15] text-forest-800 sm:text-4xl lg:text-5xl">
            Three things we tell every traveller before they go
          </h2>
          <p className="mx-auto mt-5 max-w-2xl leading-relaxed text-ink-soft">
            Twelve years of planning trips has taught us that the small
            decisions made weeks before departure are the ones that shape the
            journey.
          </p>

          <ul className="mt-16 grid gap-10 text-left sm:grid-cols-3 sm:gap-8">
            {notes.map((note) => {
              const Icon = note.icon;
              return (
                <li key={note.title} className="sm:text-center">
                  <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-forest-50 text-forest-700">
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <h3 className="mt-5 text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-forest-800">
                    {note.title}
                  </h3>
                  <p className="mt-3 text-sm leading-relaxed text-ink-soft">
                    {note.description}
                  </p>
                </li>
              );
            })}
          </ul>
        </Container>
      </div>
    </section>
  );
}
