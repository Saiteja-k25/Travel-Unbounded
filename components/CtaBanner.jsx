import Link from "next/link";
import { ArrowRight } from "lucide-react";
import Container from "./Container";

// Closing call to action, reused on the home and about pages.
export default function CtaBanner({
  title = "Tell us where you want to wake up.",
  description = "Share a few details and one of our travel experts will come back to you within 24 hours with a route worth taking.",
}) {
  return (
    <section className="bg-forest-800">
      <Container className="py-20 sm:py-28">
        <div className="flex flex-col items-start gap-8 md:flex-row md:items-center md:justify-between">
          <div className="max-w-xl">
            <h2 className="font-serif text-3xl text-bone sm:text-4xl">{title}</h2>
            <p className="mt-4 leading-relaxed text-forest-200">{description}</p>
          </div>

          <Link
            href="/contact"
            className="inline-flex shrink-0 items-center gap-2 rounded-full bg-clay-600 px-7 py-3.5 font-medium text-white transition hover:bg-clay-700"
          >
            Start Planning
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
      </Container>
    </section>
  );
}
