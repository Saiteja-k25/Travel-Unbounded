// Server-side reads for destinations.
//
// SERVER ONLY. This imports Mongoose, so it must never be imported by a
// "use client" component - that would try to pull the database driver into the
// browser bundle. Server components call these and pass the plain objects down
// as props.
//
// Everything is returned as plain, serialisable objects: Mongoose documents
// cannot cross the server/client boundary, and _id is an ObjectId that React
// cannot render. So _id becomes a string id, which is also what keeps
// DestinationCard and DestinationCarousel working unchanged - they were
// written against the static objects' `id`.

import connectToDatabase from "@/lib/mongodb";
import Destination from "@/models/Destination";
import { destinations as seedDestinations } from "@/data/destinations";

// Turns a lean Mongoose result into something a client component can receive.
function toPlainObject(document) {
  return {
    id: document._id.toString(),
    name: document.name,
    country: document.country,
    image: document.image,
    imageAlt: document.imageAlt,
    description: document.description,
    price: document.price,
    category: document.category,
  };
}

// If the database cannot be reached, fall back to the file the collection was
// seeded from rather than crashing the home page. A marketing site showing
// slightly stale destinations is far better than one showing an error, and
// this is a read-only path so there is nothing to corrupt. The failure is
// logged so it does not pass unnoticed.
function fallback() {
  return seedDestinations.map((destination) => ({
    ...destination,
    id: String(destination.id),
  }));
}

export async function getDestinations() {
  try {
    await connectToDatabase();

    // .lean() returns plain JS objects instead of full Mongoose documents,
    // which is both faster and what we need for serialisation.
    const documents = await Destination.find({})
      .sort({ category: 1, price: 1 })
      .lean();

    // An empty collection means the seed has not been run. Showing an empty
    // home page would look broken, so treat it like a failure to read.
    if (documents.length === 0) {
      console.warn(
        "No destinations in the database. Run `npm run seed:destinations -- --apply`. Falling back to seed data."
      );
      return fallback();
    }

    return documents.map(toPlainObject);
  } catch (error) {
    console.error("Failed to load destinations from the database:", error);
    return fallback();
  }
}

// The home page renders two sections, so it needs the list split in two.
export async function getDestinationsByCategory() {
  const all = await getDestinations();

  return {
    india: all.filter((destination) => destination.category === "india"),
    international: all.filter(
      (destination) => destination.category === "international"
    ),
  };
}

// Just the names, for the enquiry form's dropdown and for the server-side
// check that a submitted destination is one we actually offer.
export async function getDestinationNames() {
  const all = await getDestinations();
  return all.map((destination) => destination.name);
}
