import Hero from "@/components/Hero";
import DestinationSection from "@/components/DestinationSection";
import CtaBanner from "@/components/CtaBanner";
import {
  indiaDestinations,
  internationalDestinations,
} from "@/data/destinations";

export const metadata = {
  title: "Travel Unbounded | Experiential Travel Experts",
  description:
    "Personally-vetted journeys across Kerala, Ladakh, Kenya, Iceland and beyond. Plan your trip with India's experiential travel specialists.",
};

export default function Home() {
  return (
    <main className="flex-1">
      <Hero />

      <DestinationSection
        id="india"
        eyebrow="Closer to home"
        title="Explore India"
        description="From backwaters to high-altitude desert, these are the routes our team travels again and again."
        destinations={indiaDestinations}
      />

      <DestinationSection
        id="international"
        eyebrow="Further afield"
        title="Explore the World"
        description="Safaris, limestone bays and long northern nights, planned end to end from our Bengaluru and Nairobi offices."
        destinations={internationalDestinations}
        className="bg-sand/40"
      />

      <CtaBanner />
    </main>
  );
}
