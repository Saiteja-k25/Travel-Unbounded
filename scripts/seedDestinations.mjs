// One-off migration: move the ten static destinations into MongoDB.
//
// Phase 1 kept them in data/destinations.js. Phase 2 needs CRUD on them, so
// the database becomes the source of truth and that file is only a seed.
//
//   node scripts/seedDestinations.mjs           <- dry run, writes nothing
//   node scripts/seedDestinations.mjs --apply   <- actually writes
//
// Safe to run more than once: each destination is upserted by name, so a
// second run updates rather than duplicating. Nothing is ever deleted - if a
// destination has been edited or added through the dashboard, re-seeding will
// overwrite the ten seeded ones and leave anything else alone.
//
// Written against the raw collection rather than models/Destination.js,
// because that file uses the "@/" path alias which plain node cannot resolve.

import fs from "node:fs";
import mongoose from "mongoose";
import { destinations } from "../data/destinations.js";

const APPLY = process.argv.includes("--apply");

function readEnv(key) {
  const raw = fs.readFileSync(".env.local", "utf8");
  const match = raw.match(new RegExp(`^\\s*${key}\\s*=\\s*(.*)$`, "m"));
  if (!match) throw new Error(`${key} is not set in .env.local`);
  return match[1].replace(/^["']|["']$/g, "").trim();
}

// The static objects carry a numeric `id` that Mongo replaces with `_id`, so
// it is dropped here rather than stored as a second, meaningless identifier.
function toDocument({ name, country, image, imageAlt, description, price, category }) {
  return { name, country, image, imageAlt, description, price, category };
}

async function main() {
  const uri = readEnv("MONGODB_URI");

  await mongoose.connect(uri, { serverSelectionTimeoutMS: 20000 });
  const collection = mongoose.connection.db.collection("destinations");

  const existing = await collection.countDocuments();
  const documents = destinations.map(toDocument);

  console.log(`database          : ${mongoose.connection.db.databaseName}`);
  console.log(`already in DB     : ${existing}`);
  console.log(`in the seed file  : ${documents.length}`);

  const byCategory = documents.reduce((acc, d) => {
    acc[d.category] = (acc[d.category] ?? 0) + 1;
    return acc;
  }, {});
  console.log(`seed by category  : ${JSON.stringify(byCategory)}`);

  if (!APPLY) {
    console.log("\nDRY RUN. Would upsert these by name:");
    for (const d of documents) {
      console.log(`  ${d.name.padEnd(20)} ${d.category.padEnd(14)} Rs ${d.price}`);
    }
    console.log("\nRe-run with --apply to write them.");
    await mongoose.disconnect();
    return;
  }

  // Unique index on name, so a re-run cannot create duplicates even if the
  // upserts were somehow run concurrently.
  await collection.createIndex({ name: 1 }, { unique: true });
  await collection.createIndex({ category: 1 });

  const now = new Date();
  let inserted = 0;
  let updated = 0;

  for (const document of documents) {
    const result = await collection.updateOne(
      { name: document.name },
      {
        $set: { ...document, updatedAt: now },
        // Only applied when this upsert actually inserts, so re-running does
        // not keep resetting createdAt.
        $setOnInsert: { createdAt: now },
      },
      { upsert: true }
    );

    if (result.upsertedCount) inserted += 1;
    else if (result.modifiedCount) updated += 1;
  }

  console.log(`\ninserted : ${inserted}`);
  console.log(`updated  : ${updated}`);
  console.log(`unchanged: ${documents.length - inserted - updated}`);

  // Verify rather than assume.
  const total = await collection.countDocuments();
  const counts = await collection
    .aggregate([{ $group: { _id: "$category", count: { $sum: 1 } } }, { $sort: { _id: 1 } }])
    .toArray();

  console.log(`\ntotal in DB now   : ${total}`);
  for (const row of counts) {
    console.log(`  ${String(row._id).padEnd(14)} ${row.count}`);
  }

  const missingFields = await collection.countDocuments({
    $or: [
      { name: { $exists: false } },
      { image: { $exists: false } },
      { imageAlt: { $exists: false } },
      { price: { $exists: false } },
      { category: { $exists: false } },
    ],
  });

  if (missingFields > 0) {
    throw new Error(`${missingFields} destination(s) are missing required fields.`);
  }

  console.log("every document has the required fields.");

  await mongoose.disconnect();
}

main().catch(async (error) => {
  console.error("\nSeed failed:", error.message);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
