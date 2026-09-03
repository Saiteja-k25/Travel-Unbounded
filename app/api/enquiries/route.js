import { NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import Enquiry from "@/models/Enquiry";
import { requireAdmin } from "@/lib/requireAdmin";
import { ENQUIRY_STATUSES } from "@/lib/validateEnquiry";

// GET /api/enquiries
//
// The admin enquiries table: filter by status, search by name or email, paged.
//
// ADMIN ONLY. Every row holds a real person's name, email and phone number, so
// this is the single most sensitive endpoint in the project. requireAdmin runs
// first, before the database is even touched.
//
// Kept separate from app/api/enquiry/route.js, which is the PUBLIC form
// endpoint, so that no file mixes public and admin handlers - someone editing
// one should never have to work out which audience a given export serves.

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;
const MAX_SEARCH_LENGTH = 80;

// A search term goes into a regular expression, so any regex metacharacter it
// contains would otherwise be interpreted rather than matched. Left unescaped,
// "a{1000000}" or a nested quantifier is a denial-of-service against our own
// database, and "." would match every row.
function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function parsePositiveInteger(raw, fallback, max) {
  if (raw === null || raw === undefined || raw === "") return fallback;
  if (!/^\d+$/.test(raw)) return fallback;

  const parsed = Number.parseInt(raw, 10);
  if (!Number.isInteger(parsed) || parsed < 1) return fallback;

  return Math.min(parsed, max);
}

export async function GET(request) {
  // 1. Authenticate before anything else.
  const auth = await requireAdmin(request);
  if (!auth.ok) return auth.response;

  const { searchParams } = new URL(request.url);

  // 2. Validate every query parameter. These come straight off the URL, so
  // none of them can be trusted.
  const statusParam = (searchParams.get("status") ?? "").trim();
  const status =
    statusParam && ENQUIRY_STATUSES.includes(statusParam) ? statusParam : null;

  const search = (searchParams.get("search") ?? "")
    .trim()
    .slice(0, MAX_SEARCH_LENGTH);

  const limit = parsePositiveInteger(searchParams.get("limit"), DEFAULT_LIMIT, MAX_LIMIT);
  const page = parsePositiveInteger(searchParams.get("page"), 1, 10000);

  // An unrecognised status silently means "all" rather than an error: the
  // filter is a convenience, and a bad value should not break the table.
  const query = {};
  if (status) query.status = status;

  if (search) {
    const pattern = new RegExp(escapeRegex(search), "i");
    query.$or = [{ fullName: pattern }, { email: pattern }];
  }

  try {
    await connectToDatabase();

    const [rows, total, statusGroups] = await Promise.all([
      Enquiry.find(query)
        // Newest first: an admin cares about what just came in.
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),

      Enquiry.countDocuments(query),

      // Counts for the filter tabs. Deliberately computed over ALL enquiries,
      // not the filtered set, so the tabs still show where everything is once
      // a filter is applied.
      Enquiry.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]),
    ]);

    // Build a count for every status, including those with none, so the UI can
    // render a stable set of tabs.
    const counts = Object.fromEntries(ENQUIRY_STATUSES.map((s) => [s, 0]));
    let allCount = 0;
    for (const group of statusGroups) {
      if (group._id in counts) counts[group._id] = group.count;
      allCount += group.count;
    }

    return NextResponse.json(
      {
        success: true,
        enquiries: rows.map((row) => ({
          // _id is an ObjectId, which cannot be serialised to JSON.
          id: row._id.toString(),
          fullName: row.fullName,
          email: row.email,
          countryCode: row.countryCode,
          contactNumber: row.contactNumber,
          dateOfTravel: row.dateOfTravel,
          numberOfPeople: row.numberOfPeople,
          numberOfChildren: row.numberOfChildren,
          hotelCategory: row.hotelCategory,
          destination: row.destination ?? null,
          tripDurationNights: row.tripDurationNights ?? null,
          // Older documents predate the field. The backfill migration set them
          // all, but this keeps the table honest if any slip through.
          status: row.status ?? ENQUIRY_STATUSES[0],
          createdAt: row.createdAt,
        })),
        pagination: {
          page,
          limit,
          total,
          pageCount: Math.max(1, Math.ceil(total / limit)),
        },
        counts: { all: allCount, ...counts },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Failed to load enquiries:", error);

    return NextResponse.json(
      { success: false, message: "Could not load enquiries. Please try again." },
      { status: 500 }
    );
  }
}
