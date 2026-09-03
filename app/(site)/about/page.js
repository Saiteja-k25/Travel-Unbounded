import Image from "next/image";
import PageHeader from "@/components/PageHeader";
import Container from "@/components/Container";
import OfficeLocations from "@/components/OfficeLocations";
import WhyChooseUs from "@/components/WhyChooseUs";
import CtaBanner from "@/components/CtaBanner";

export const metadata = {
  title: "About Us | Travel Unbounded",
  description:
    "Headquartered in Bengaluru with offices in Kochi and Nairobi, Travel Unbounded designs trips that blend comfort, culture and raw nature.",
};

export default function AboutPage() {
  return (
    <main className="flex-1">
      <PageHeader
        eyebrow="About us"
        title="Journeys built around the people taking them"
        description="Headquartered in Bengaluru with offices in Kerala and Nairobi, we design trips that blend comfort, culture and raw nature."
        image="https://images.unsplash.com/photo-1645788421204-0e4eb1d2a518?auto=format&fit=crop&w=2000&q=70"
        imageAlt="Panoramic view of a distant mountain range"
      />

      {/* Company story */}
      <section className="py-20 sm:py-28 lg:py-32">
        <Container>
          <div className="grid items-center gap-14 lg:grid-cols-2 lg:gap-20">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-clay-700">
                Our story
              </p>
              <h2 className="mt-3 font-serif text-3xl leading-tight text-forest-800 sm:text-4xl">
                The best journeys aren&rsquo;t sold from a catalogue
              </h2>

              <div className="mt-6 space-y-5 leading-relaxed text-ink-soft">
                <p>
                  Travel Unbounded was born from a simple belief &mdash; that
                  the best journeys aren&rsquo;t sold from a catalogue.
                  They&rsquo;re built around the people taking them.
                </p>
                <p>
                  Headquartered in Bangalore with offices in Kerala and Nairobi,
                  we design trips that blend comfort, culture and raw nature.
                  Every destination, resort and activity we recommend has been
                  personally experienced by our team.
                </p>
                <p>
                  From spotting the Big Five at dawn in the Masai Mara to
                  cruising Ha Long Bay at sunset &mdash; we go where real
                  stories are written, and we bring you along.
                </p>
              </div>
            </div>

            <div className="relative aspect-[4/3] overflow-hidden rounded-2xl">
              <Image
                src="https://images.unsplash.com/photo-1516426122078-c23e76319801?auto=format&fit=crop&w=1400&q=70"
                alt="Traveller watching the sun set over the savannah from a safari vehicle"
                fill
                sizes="(min-width: 1024px) 50vw, 100vw"
                className="object-cover"
              />
            </div>
          </div>
        </Container>
      </section>

      <OfficeLocations />
      <WhyChooseUs />
      <CtaBanner
        title="Ready to plan something worth remembering?"
        description="Tell us who is travelling and roughly when. We will come back within 24 hours with a route, not a package."
      />
    </main>
  );
}
