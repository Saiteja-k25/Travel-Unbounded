import Hero from "@/components/Hero";
import TravelNotes from "@/components/TravelNotes";
import DestinationSection from "@/components/DestinationSection";
import WordMarquee from "@/components/WordMarquee";
import CtaBanner from "@/components/CtaBanner";
import { getDestinationsByCategory } from "@/lib/destinations";

// Destinations are editable from the admin dashboard, so this page reads them
// per request rather than being baked in at build time. Without this, adding
// or editing a destination would not show until the next deploy.
export const dynamic = "force-dynamic";

export const metadata = {
  title: "Travel Unbounded | Experiential Travel Experts",
  description:
    "Personally-vetted journeys across Kerala, Ladakh, Kenya, Iceland and beyond. Plan your trip with India's experiential travel specialists.",
};

export default async function Home() {
  // One database read, split into the two sections the page renders.
  const { india, international } = await getDestinationsByCategory();

  return (
    <main className="flex-1">
      <Hero />

      <TravelNotes />

      <DestinationSection
        id="india"
        eyebrow="Closer to home"
        title="Explore India"
        description="From backwaters to high-altitude desert, these are the routes our team travels again and again."
        destinations={india}
      />

      <DestinationSection
        id="international"
        eyebrow="Further afield"
        title="Explore the World"
        description="Safaris, limestone bays and long northern nights, planned end to end from our Bengaluru and Nairobi offices."
        destinations={international}
        className="bg-sand/30"
      />

      <WordMarquee />

      <CtaBanner />
    </main>
  );
}
