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

// Every date in this file is a calendar day in ONE timezone.
//
// This matters more than it looks. The aggregation groups by day using
// $dateToString with a timezone, while the list of buckets is built in
// JavaScript - and if those two disagree, counts fall into a bucket that does
// not exist and silently vanish from the chart.
//
// That is exactly what happened: the buckets used to be built from the
// server's local date, which is IST on a developer machine but UTC on Vercel.
// The tests passed locally and the deployed chart under-reported, dropping an
// enquiry created late evening IST into a day the bucket list did not have yet.
//
// India has no daylight saving, so the offset is a constant +05:30.
const TIMEZONE = "Asia/Kolkata";
const TIMEZONE_OFFSET = "+05:30";

// A Date to "YYYY-MM-DD" as it reads in TIMEZONE, not where the server is.
// en-CA formats as YYYY-MM-DD, which is what $dateToString produces.
const isoDateFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: TIMEZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

function toIsoDateInZone(date) {
  return isoDateFormatter.format(date);
}

// The instant at which a given calendar day starts in TIMEZONE.
function startOfDayInZone(isoDate) {
  return new Date(`${isoDate}T00:00:00${TIMEZONE_OFFSET}`);
}

function parseDays(raw) {
  if (!raw || !/^\d+$/.test(raw)) return DEFAULT_DAYS;
  const parsed = Number.parseInt(raw, 10);
  if (parsed < 1) return DEFAULT_DAYS;
  return Math.min(parsed, MAX_DAYS);
}

export async function GET(request) {
  const auth = await requireAdmin(request);
  if (!auth.ok) return auth.response;

  const { searchParams } = new URL(request.url);
  const days = parseDays(searchParams.get("days"));

  // Start of the day, `days - 1` days ago, so a range of 1 means today only -
  // all reckoned in TIMEZONE, so the window lines up exactly with the buckets
  // the aggregation produces.
  const todayInZone = toIsoDateInZone(new Date());
  const startDay = startOfDayInZone(todayInZone);
  startDay.setUTCDate(startDay.getUTCDate() - (days - 1));
  const since = startDay;

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
                  timezone: TIMEZONE,
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
      // Stepping in UTC from an instant that is midnight IST keeps every step
      // on a day boundary, because the offset never changes.
      const date = new Date(since);
      date.setUTCDate(date.getUTCDate() + offset);
      const key = toIsoDateInZone(date);
      timeline.push({ date: key, count: countsByDay.get(key) ?? 0 });
    }

    // If these disagree, a day produced by the aggregation is missing from the
    // buckets and its count has been dropped. Logged rather than thrown: a
    // chart that is slightly wrong is better than a dashboard that errors, but
    // it must not pass unnoticed.
    const bucketed = timeline.reduce((sum, row) => sum + row.count, 0);
    if (bucketed !== enquiriesInRange) {
      console.error(
        `Analytics timeline dropped rows: buckets total ${bucketed} but ${enquiriesInRange} enquiries are in range. Check the timezone used for bucketing.`
      );
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
