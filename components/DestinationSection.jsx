import Container from "./Container";
import DestinationCarousel from "./DestinationCarousel";

// A titled block of destination cards in a draggable slider. Both the India
// and the International sections are this same component with different props.
export default function DestinationSection({
  id,
  eyebrow,
  title,
  description,
  destinations,
  className = "",
}) {
  return (
    <section
      id={id}
      className={`scroll-mt-24 py-20 sm:py-28 lg:py-32 ${className}`}
    >
      <Container>
        <div className="max-w-2xl">
          <p className="text-[0.7rem] font-semibold uppercase tracking-[0.22em] text-clay-700">
            {eyebrow}
          </p>
          <h2 className="mt-4 font-serif text-3xl leading-[1.15] text-forest-800 sm:text-4xl lg:text-5xl">
            {title}
          </h2>
          <p className="mt-5 leading-relaxed text-ink-soft">{description}</p>
        </div>

        <div className="mt-14">
          <DestinationCarousel destinations={destinations} label={title} />
        </div>
      </Container>
    </section>
  );
}
