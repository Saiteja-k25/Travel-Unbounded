import Image from "next/image";
import Container from "./Container";

// Compact page banner used at the top of the About and Contact pages.
export default function PageHeader({ eyebrow, title, description, image, imageAlt }) {
  return (
    <section className="relative isolate overflow-hidden bg-forest-900">
      <Image
        src={image}
        alt={imageAlt}
        fill
        priority
        sizes="100vw"
        className="object-cover opacity-45"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-forest-900 via-forest-900/60 to-forest-900/40" />

      <Container className="relative py-20 sm:py-28">
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-clay-300">
          {eyebrow}
        </p>
        <h1 className="mt-4 max-w-3xl font-serif text-4xl leading-tight text-bone sm:text-5xl">
          {title}
        </h1>
        <p className="mt-5 max-w-2xl leading-relaxed text-forest-100">
          {description}
        </p>
      </Container>
    </section>
  );
}
