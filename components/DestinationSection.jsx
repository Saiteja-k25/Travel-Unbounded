import Container from "./Container";
import DestinationCard from "./DestinationCard";

// A titled block of destination cards. Both the India and the International
// sections on the home page are this same component with different props.
export default function DestinationSection({
  id,
  eyebrow,
  title,
  description,
  destinations,
  className = "",
}) {
  return (
    <section id={id} className={`scroll-mt-20 py-16 sm:py-24 ${className}`}>
      <Container>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-clay-700">
          {eyebrow}
        </p>
        <h2 className="mt-3 max-w-2xl font-serif text-3xl leading-tight text-forest-800 sm:text-4xl">
          {title}
        </h2>
        <p className="mt-4 max-w-2xl leading-relaxed text-ink-soft">
          {description}
        </p>

        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {destinations.map((destination) => (
            <DestinationCard key={destination.id} destination={destination} />
          ))}
        </div>
      </Container>
    </section>
  );
}
