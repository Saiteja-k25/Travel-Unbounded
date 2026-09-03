import { NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import Enquiry from "@/models/Enquiry";
import Destination from "@/models/Destination";
import { requireAdmin } from "@/lib/requireAdmin";
import { ENQUIRY_STATUSES } from "@/lib/validateEnquiry";

// GET /api/analytics/summary
//
// Figures for the dashboard charts: enquiries over time, and a breakdown by
// status.
//
// ADMIN ONLY. The numbers themselves are not personal data, but they are
// commercial information - how many leads come in, and how many convert.
//
// Everything is aggregated inside MongoDB rather than by fetching every
// enquiry and counting in JavaScript. That keeps the response small however
// many enquiries there are, and it means the charts and the table are counting
// the same thing in the same place.

const DEFAULT_DAYS = 30;
const MAX_DAYS = 365;

function parseDays(raw) {
  if (!raw || !/^\d+$/.test(raw)) return DEFAULT_DAYS;
  const parsed = Number.parseInt(raw, 10);
  if (parsed < 1) return DEFAULT_DAYS;
  return Math.min(parsed, MAX_DAYS);
}

// Local YYYY-MM-DD for a Date, matching how the aggregation buckets days.
function toIsoDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export async function GET(request) {
  const auth = await requireAdmin(request);
  if (!auth.ok) return auth.response;

  const { searchParams } = new URL(request.url);
  const days = parseDays(searchParams.get("days"));

  // Start of the day, `days - 1` days ago, so a range of 1 means today only.
  const since = new Date();
  since.setHours(0, 0, 0, 0);
  since.setDate(since.getDate() - (days - 1));

  try {
    await connectToDatabase();

    const [byStatus, perDay, byHotel, topDestinations, totals] =
      await Promise.all([
        Enquiry.aggregate([
          { $group: { _id: "$status", count: { $sum: 1 } } },
        ]),

        // Enquiries per day within the window. $dateToString buckets by
        // calendar day in a fixed timezone, so the same enquiry always lands
        // in the same bucket regardless of where the request comes from.
        Enquiry.aggregate([
          { $match: { createdAt: { $gte: since } } },
          {
            $group: {
              _id: {
                $dateToString: {
                  format: "%Y-%m-%d",
                  date: "$createdAt",
                  timezone: "Asia/Kolkata",
                },
              },
              count: { $sum: 1 },
            },
          },
          { $sort: { _id: 1 } },
        ]),

        Enquiry.aggregate([
          { $group: { _id: "$hotelCategory", count: { $sum: 1 } } },
          { $sort: { count: -1 } },
        ]),

        // Which destinations people actually ask about. Enquiries without one
        // are excluded rather than shown as a blank slice.
        Enquiry.aggregate([
          { $match: { destination: { $ne: null } } },
          { $group: { _id: "$destination", count: { $sum: 1 } } },
          { $sort: { count: -1, _id: 1 } },
          { $limit: 8 },
        ]),

        Promise.all([
          Enquiry.countDocuments(),
          Enquiry.countDocuments({ createdAt: { $gte: since } }),
          Destination.countDocuments(),
        ]),
      ]);

    const [totalEnquiries, enquiriesInRange, totalDestinations] = totals;

    // Fill in every status, including those with none, so the chart has a
    // stable set of slices instead of appearing and disappearing.
    const statusCounts = Object.fromEntries(
      ENQUIRY_STATUSES.map((status) => [status, 0])
    );
    for (const row of byStatus) {
      if (row._id in statusCounts) statusCounts[row._id] = row.count;
    }

    // Fill in every day in the window, including the empty ones. Without this
    // a line chart would join two distant points and imply a steady trickle
    // where there was actually nothing at all.
    const countsByDay = new Map(perDay.map((row) => [row._id, row.count]));
    const timeline = [];
    for (let offset = 0; offset < days; offset += 1) {
      const date = new Date(since);
      date.setDate(date.getDate() + offset);
      const key = toIsoDate(date);
      timeline.push({ date: key, count: countsByDay.get(key) ?? 0 });
    }

    const converted = statusCounts.Converted ?? 0;

    return NextResponse.json(
      {
        success: true,
        range: { days, since: since.toISOString() },
        totals: {
          enquiries: totalEnquiries,
          inRange: enquiriesInRange,
          destinations: totalDestinations,
          // Rounded to one decimal place. Guarded against dividing by zero,
          // which would otherwise render as NaN.
          conversionRate:
            totalEnquiries > 0
              ? Math.round((converted / totalEnquiries) * 1000) / 10
              : 0,
        },
        byStatus: ENQUIRY_STATUSES.map((status) => ({
          status,
          count: statusCounts[status],
        })),
        timeline,
        byHotelCategory: byHotel.map((row) => ({
          category: row._id ?? "Unknown",
          count: row.count,
        })),
        topDestinations: topDestinations.map((row) => ({
          destination: row._id,
          count: row.count,
        })),
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Failed to build the analytics summary:", error);

    return NextResponse.json(
      { success: false, message: "Could not load analytics." },
      { status: 500 }
    );
  }
}
