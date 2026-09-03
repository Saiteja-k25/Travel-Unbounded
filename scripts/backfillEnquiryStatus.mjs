// One-off migration: give existing enquiries a status.
//
// Why this is needed at all: Mongoose applies `default` when a document is
// CREATED, never retroactively. Enquiries saved before the status field
// existed therefore read back as `status: undefined`, not "New". The dashboard
// table would look fine - undefined renders as blank - but the "New" filter
// would miss them, and the analytics chart would be wrong, because that groups
// inside MongoDB where a JavaScript fallback does not exist.
//
// Run it once. It is safe to run again: documents that already have a status
// are not matched, so a second run reports zero and changes nothing.
//
//   node scripts/backfillEnquiryStatus.mjs           <- dry run, writes nothing
//   node scripts/backfillEnquiryStatus.mjs --apply   <- actually writes
//
// Dry run is the default deliberately. This talks to the real Atlas database
// named in .env.local, so writing must be an explicit choice.

import fs from "node:fs";
import mongoose from "mongoose";

// Mirrors ENQUIRY_STATUSES[0] in lib/validateEnquiry.js. Restated because
// plain node cannot resolve the "@/" path alias that Next provides.
const DEFAULT_STATUS = "New";

const APPLY = process.argv.includes("--apply");

function readEnv(key) {
  const raw = fs.readFileSync(".env.local", "utf8");
  const match = raw.match(new RegExp(`^\\s*${key}\\s*=\\s*(.*)$`, "m"));
  if (!match) throw new Error(`${key} is not set in .env.local`);
  return match[1].replace(/^["']|["']$/g, "").trim();
}

async function main() {
  const uri = readEnv("MONGODB_URI");

  await mongoose.connect(uri, { serverSelectionTimeoutMS: 20000 });
  const enquiries = mongoose.connection.db.collection("enquiries");

  const total = await enquiries.countDocuments();
  const missing = await enquiries.countDocuments({ status: { $exists: false } });

  console.log(`database        : ${mongoose.connection.db.databaseName}`);
  console.log(`enquiries total : ${total}`);
  console.log(`missing status  : ${missing}`);

  if (missing === 0) {
    console.log("\nNothing to do - every enquiry already has a status.");
    await mongoose.disconnect();
    return;
  }

  if (!APPLY) {
    console.log(
      `\nDRY RUN. Would set status="${DEFAULT_STATUS}" on ${missing} document(s).`
    );
    console.log("Re-run with --apply to write the change.");
    await mongoose.disconnect();
    return;
  }

  const result = await enquiries.updateMany(
    { status: { $exists: false } },
    { $set: { status: DEFAULT_STATUS } }
  );

  console.log(`\nmatched  : ${result.matchedCount}`);
  console.log(`modified : ${result.modifiedCount}`);

  // Prove the migration is complete rather than assuming it worked.
  const stillMissing = await enquiries.countDocuments({
    status: { $exists: false },
  });
  const byStatus = await enquiries
    .aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }, { $sort: { _id: 1 } }])
    .toArray();

  console.log(`still missing: ${stillMissing}`);
  console.log("\nfinal counts by status:");
  for (const row of byStatus) {
    console.log(`  ${String(row._id).padEnd(12)} ${row.count}`);
  }

  if (stillMissing !== 0) {
    throw new Error("Some documents still have no status. Investigate before continuing.");
  }

  await mongoose.disconnect();
}

main().catch(async (error) => {
  console.error("\nBackfill failed:", error.message);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
