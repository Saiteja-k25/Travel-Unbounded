import DestinationCard from "./DestinationCard";

// A titled block of destination cards. Both the India and the International
// sections on the home page are this same component with different props.
export default function DestinationSection({
  id,
  eyebrow,
  title,
  description,
  destinations,
}) {
  return (
    <section id={id} className="py-16 sm:py-20">
      <div className="mx-auto w-full max-w-6xl px-6">
        <p className="text-sm font-medium uppercase tracking-widest text-clay-700">
          {eyebrow}
        </p>
        <h2 className="mt-2 font-serif text-3xl text-forest-800 sm:text-4xl">
          {title}
        </h2>
        <p className="mt-3 max-w-2xl text-ink-soft">{description}</p>

        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {destinations.map((destination) => (
            <DestinationCard key={destination.id} destination={destination} />
          ))}
        </div>
      </div>
    </section>
  );
}
