import DestinationSection from "@/components/DestinationSection";
import {
  indiaDestinations,
  internationalDestinations,
} from "@/data/destinations";

export default function Home() {
  return (
    <main className="flex-1">
      <DestinationSection
        id="india"
        eyebrow="Closer to home"
        title="Explore India"
        description="Ten states, one team that has personally travelled every route we recommend."
        destinations={indiaDestinations}
      />

      <DestinationSection
        id="international"
        eyebrow="Further afield"
        title="Explore the World"
        description="Safaris, coastlines and cold-weather escapes, planned end to end from Bengaluru and Nairobi."
        destinations={internationalDestinations}
      />
    </main>
  );
}
