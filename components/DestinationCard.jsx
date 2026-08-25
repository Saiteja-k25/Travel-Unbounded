import Image from "next/image";
import Link from "next/link";
import { ArrowRight, MapPin } from "lucide-react";

// Renders one destination. Every card on the site comes from this component,
// so the markup lives in exactly one place.
export default function DestinationCard({ destination }) {
  const { name, country, image, imageAlt, description, price } = destination;

  return (
    <article className="group flex flex-col overflow-hidden rounded-2xl border border-sand bg-white shadow-sm transition hover:shadow-md">
      <div className="relative aspect-[4/3] overflow-hidden">
        <Image
          src={image}
          alt={imageAlt}
          fill
          sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
          className="object-cover transition duration-500 group-hover:scale-105"
        />
      </div>

      <div className="flex flex-1 flex-col p-5">
        <h3 className="font-serif text-2xl text-forest-800">{name}</h3>

        <p className="mt-1 flex items-center gap-1.5 text-sm text-ink-soft">
          <MapPin className="h-4 w-4" aria-hidden="true" />
          {country}
        </p>

        <p className="mt-3 flex-1 text-sm leading-relaxed text-ink-soft">
          {description}
        </p>

        <div className="mt-5 flex items-end justify-between border-t border-sand pt-4">
          <div>
            <p className="text-xs uppercase tracking-wide text-ink-soft">
              Starting from
            </p>
            <p className="font-serif text-xl text-ink">
              &#8377;{price.toLocaleString("en-IN")}
            </p>
          </div>

          <Link
            href="/contact"
            className="inline-flex items-center gap-1.5 rounded-full bg-forest-700 px-4 py-2 text-sm font-medium text-bone transition hover:bg-forest-800"
          >
            Enquire
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </article>
  );
}
