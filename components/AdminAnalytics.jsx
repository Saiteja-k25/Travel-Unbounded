"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AlertCircle, Loader2, Table2 } from "lucide-react";
import { adminJson } from "@/lib/adminApi";

// Analytics charts.
//
// Every figure is aggregated inside MongoDB by /api/analytics/summary, which
// means the charts and the enquiries table are counting the same thing in the
// same place. Counting in JavaScript here would be a second implementation
// that could quietly disagree with the table.

// Categorical palette for the four statuses, in pipeline order.
//
// Chosen by running the palette validator against this dark surface (#16302a)
// rather than by eye. It passes the lightness band, the chroma floor, CVD
// separation (worst adjacent pair dE 8.4 under simulated protanopia), the
// normal-vision floor, and 3:1 contrast against the surface.
//
// The ORDER is part of what passes: putting the green next to the terracotta
// dropped the worst adjacent pair to 7.9, below target. Slots are fixed to
// statuses and never cycled, so filtering can never repaint them.
const STATUS_COLORS = {
  New: "#c96742",
  Contacted: "#7370c9",
  Converted: "#249472",
  Closed: "#ab8329",
};

// Single-series marks. One hue, so no categorical separation to check.
const SERIES = "#4f9d7d";
const AXIS = "#4a7566"; // recessive axes and grid
const RANGES = [
  { days: 7, label: "7 days" },
  { days: 30, label: "30 days" },
  { days: 90, label: "90 days" },
];

function formatDayLabel(iso) {
  const date = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

// One tooltip shape for every chart, so hovering behaves the same everywhere.
function ChartTooltip({ active, payload, label, labelFormatter }) {
  if (!active || !payload?.length) return null;

  const row = payload[0];

  return (
    <div className="rounded-lg border border-forest-600 bg-forest-900/95 px-3 py-2 text-xs shadow-lg">
      <p className="text-forest-300">
        {labelFormatter ? labelFormatter(label, row) : label}
      </p>
      <p className="mt-0.5 font-medium text-bone">
        {row.value} {row.value === 1 ? "enquiry" : "enquiries"}
      </p>
    </div>
  );
}

function StatTile({ label, value, hint }) {
  return (
    <div className="rounded-2xl border border-forest-700 bg-forest-800/40 p-5">
      <p className="text-xs uppercase tracking-widest text-forest-400">{label}</p>
      {/* A single headline number is not a chart. */}
      <p className="mt-2 font-serif text-3xl text-bone">{value}</p>
      {hint && <p className="mt-1 text-xs text-forest-300">{hint}</p>}
    </div>
  );
}

function Panel({ title, subtitle, children }) {
  return (
    <div className="rounded-2xl border border-forest-700 bg-forest-800/30 p-5 sm:p-6">
      <h3 className="font-serif text-lg text-bone">{title}</h3>
      {subtitle && <p className="mt-1 text-xs text-forest-300">{subtitle}</p>}
      <div className="mt-5">{children}</div>
    </div>
  );
}

export default function AdminAnalytics() {
  const [days, setDays] = useState(30);
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [showTable, setShowTable] = useState(false);

  // As elsewhere, no state is set synchronously in the effect body.
  useEffect(() => {
    let active = true;

    adminJson(`/api/analytics/summary?days=${days}`)
      .then((result) => {
        if (!active) return;
        setData(result);
        setError("");
      })
      .catch((caught) => {
        if (active) setError(caught?.message ?? "Could not load analytics.");
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [days, reloadKey]);

  const retry = useCallback(() => {
    setIsLoading(true);
    setReloadKey((current) => current + 1);
  }, []);

  if (isLoading && !data) {
    return (
      <section>
        <h2 className="font-serif text-2xl text-bone sm:text-3xl">Analytics</h2>
        <p className="mt-8 flex items-center gap-2 text-sm text-forest-300">
          <Loader2
            className="h-4 w-4 animate-spin motion-reduce:animate-none"
            aria-hidden="true"
          />
          Loading analytics...
        </p>
      </section>
    );
  }

  if (error && !data) {
    return (
      <section>
        <h2 className="font-serif text-2xl text-bone sm:text-3xl">Analytics</h2>
        <div className="mt-6 rounded-2xl border border-clay-500/50 bg-clay-900/40 p-6 text-sm text-clay-200">
          <p className="flex items-start gap-3">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            {error}
          </p>
          <button
            type="button"
            onClick={retry}
            className="mt-4 rounded-full border border-clay-400/60 px-5 py-2 text-xs font-medium text-clay-100 transition hover:bg-clay-900/60"
          >
            Try again
          </button>
        </div>
      </section>
    );
  }

  const totals = data?.totals ?? {};
  const timeline = data?.timeline ?? [];
  const byStatus = data?.byStatus ?? [];
  const byHotel = data?.byHotelCategory ?? [];
  const topDestinations = data?.topDestinations ?? [];

  const statusTotal = byStatus.reduce((sum, row) => sum + row.count, 0);

  return (
    <section>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="font-serif text-2xl text-bone sm:text-3xl">Analytics</h2>
          <p className="mt-2 text-sm text-forest-300">
            Enquiries over time and how they are progressing.
          </p>
        </div>

        {/* Filters sit in one row above the charts. */}
        <div className="flex items-center gap-2">
          <div className="flex rounded-full border border-forest-700 p-1">
            {RANGES.map((range) => (
              <button
                key={range.days}
                type="button"
                aria-pressed={days === range.days}
                onClick={() => {
                  setIsLoading(true);
                  setDays(range.days);
                }}
                className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition ${
                  days === range.days
                    ? "bg-forest-700 text-bone"
                    : "text-forest-300 hover:text-forest-100"
                }`}
              >
                {range.label}
              </button>
            ))}
          </div>

          {/* The numbers behind the charts, for anyone who cannot read them
              from the marks - a screen reader, or print. */}
          <button
            type="button"
            aria-pressed={showTable}
            onClick={() => setShowTable((current) => !current)}
            className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-xs font-medium transition ${
              showTable
                ? "border-forest-500 bg-forest-700 text-bone"
                : "border-forest-700 text-forest-300 hover:text-forest-100"
            }`}
          >
            <Table2 className="h-3.5 w-3.5" aria-hidden="true" />
            Table
          </button>
        </div>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile label="Total enquiries" value={totals.enquiries ?? 0} />
        <StatTile
          label={`Last ${days} days`}
          value={totals.inRange ?? 0}
          hint={totals.inRange === 0 ? "Nothing new in this window" : undefined}
        />
        <StatTile
          label="Converted"
          value={`${totals.conversionRate ?? 0}%`}
          hint="Share of all enquiries"
        />
        <StatTile label="Destinations live" value={totals.destinations ?? 0} />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Panel
          title="Enquiries over time"
          subtitle={`Per day, last ${days} days. Days with none are shown as zero.`}
        >
          {/* One series, so no legend - the title names it. */}
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={timeline}
                margin={{ top: 4, right: 8, bottom: 0, left: -18 }}
              >
                <defs>
                  <linearGradient id="enquiryFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={SERIES} stopOpacity={0.35} />
                    <stop offset="100%" stopColor={SERIES} stopOpacity={0.02} />
                  </linearGradient>
                </defs>

                <XAxis
                  dataKey="date"
                  tickFormatter={formatDayLabel}
                  // Thinning the ticks rather than labelling every day, which
                  // would collide at 90 days.
                  interval={Math.max(0, Math.floor(timeline.length / 6) - 1)}
                  tick={{ fill: AXIS, fontSize: 11 }}
                  stroke={AXIS}
                  tickLine={false}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fill: AXIS, fontSize: 11 }}
                  stroke={AXIS}
                  tickLine={false}
                  width={40}
                />
                <Tooltip
                  content={<ChartTooltip labelFormatter={formatDayLabel} />}
                  cursor={{ stroke: AXIS, strokeWidth: 1 }}
                />
                <Area
                  // Straight segments, not a spline. A smoothed curve through
                  // daily counts invents values between the days - it would
                  // show two-and-a-half enquiries on a day that had none, and
                  // overshoot below zero between a spike and a gap.
                  type="linear"
                  dataKey="count"
                  stroke={SERIES}
                  strokeWidth={2}
                  fill="url(#enquiryFill)"
                  // Markers appear on hover rather than on all 90 points.
                  dot={false}
                  activeDot={{ r: 4, strokeWidth: 2, stroke: "#16302a" }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel
          title="By status"
          subtitle="Where every enquiry currently sits."
        >
          {statusTotal === 0 ? (
            <p className="py-16 text-center text-sm text-forest-400">
              No enquiries yet.
            </p>
          ) : (
            <div className="flex flex-col items-center gap-5 sm:flex-row">
              <div className="h-48 w-48 shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={byStatus}
                      dataKey="count"
                      nameKey="status"
                      innerRadius="58%"
                      outerRadius="88%"
                      // A 2px surface gap between segments.
                      paddingAngle={2}
                      stroke="#16302a"
                      strokeWidth={2}
                    >
                      {byStatus.map((row) => (
                        <Cell
                          key={row.status}
                          fill={STATUS_COLORS[row.status] ?? SERIES}
                        />
                      ))}
                    </Pie>
                    <Tooltip content={<ChartTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Legend with direct values, so identity is never carried by
                  colour alone. Labels wear text tokens; only the swatch is
                  coloured. */}
              <ul className="w-full space-y-2.5">
                {byStatus.map((row) => (
                  <li
                    key={row.status}
                    className="flex items-center justify-between gap-3 text-sm"
                  >
                    <span className="flex items-center gap-2.5 text-forest-200">
                      <span
                        aria-hidden="true"
                        className="h-2.5 w-2.5 shrink-0 rounded-full"
                        style={{ backgroundColor: STATUS_COLORS[row.status] }}
                      />
                      {row.status}
                    </span>
                    {/* A separator rather than only a margin: without it the
                        count and the percentage run together as "735%" for a
                        screen reader, which reads as one nonsense number. */}
                    <span className="text-forest-300">
                      <span className="font-medium text-bone">{row.count}</span>
                      {statusTotal > 0 && (
                        <span className="text-xs">
                          <span aria-hidden="true"> · </span>
                          <span className="sr-only">, </span>
                          {Math.round((row.count / statusTotal) * 100)}%
                        </span>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Panel>

        <Panel title="By hotel category" subtitle="What visitors are asking for.">
          {byHotel.length === 0 ? (
            <p className="py-12 text-center text-sm text-forest-400">
              No enquiries yet.
            </p>
          ) : (
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={byHotel}
                  margin={{ top: 4, right: 8, bottom: 0, left: -18 }}
                >
                  <XAxis
                    dataKey="category"
                    tick={{ fill: AXIS, fontSize: 11 }}
                    stroke={AXIS}
                    tickLine={false}
                  />
                  <YAxis
                    allowDecimals={false}
                    tick={{ fill: AXIS, fontSize: 11 }}
                    stroke={AXIS}
                    tickLine={false}
                    width={40}
                  />
                  <Tooltip
                    content={<ChartTooltip />}
                    cursor={{ fill: "#ffffff", fillOpacity: 0.04 }}
                  />
                  <Bar
                    dataKey="count"
                    fill={SERIES}
                    // Rounded data-end, anchored to the baseline.
                    radius={[4, 4, 0, 0]}
                    maxBarSize={56}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Panel>

        <Panel
          title="Most asked-about destinations"
          subtitle="From the destination chosen on the enquiry form."
        >
          {topDestinations.length === 0 ? (
            <p className="py-12 text-center text-sm text-forest-400">
              No enquiry has named a destination yet.
            </p>
          ) : (
            <div style={{ height: Math.max(140, topDestinations.length * 38) }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={topDestinations}
                  layout="vertical"
                  margin={{ top: 0, right: 24, bottom: 0, left: 8 }}
                >
                  <XAxis type="number" hide allowDecimals={false} />
                  <YAxis
                    type="category"
                    dataKey="destination"
                    tick={{ fill: "#bad8c8", fontSize: 12 }}
                    stroke={AXIS}
                    tickLine={false}
                    axisLine={false}
                    width={110}
                  />
                  <Tooltip
                    content={<ChartTooltip />}
                    cursor={{ fill: "#ffffff", fillOpacity: 0.04 }}
                  />
                  <Bar
                    dataKey="count"
                    fill={SERIES}
                    radius={[0, 4, 4, 0]}
                    barSize={14}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Panel>
      </div>

      {showTable && (
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <Panel title="By status" subtitle="The numbers behind the chart.">
            <table className="w-full text-sm">
              <caption className="sr-only">Enquiries by status</caption>
              <thead>
                <tr className="text-left text-xs uppercase tracking-wider text-forest-400">
                  <th scope="col" className="pb-2 font-medium">Status</th>
                  <th scope="col" className="pb-2 font-medium">Enquiries</th>
                </tr>
              </thead>
              <tbody>
                {byStatus.map((row) => (
                  <tr key={row.status} className="border-t border-forest-800">
                    <td className="py-2 text-forest-200">{row.status}</td>
                    <td className="py-2 text-bone">{row.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Panel>

          <Panel
            title="Per day"
            subtitle="Only days with at least one enquiry are listed."
          >
            <table className="w-full text-sm">
              <caption className="sr-only">Enquiries per day</caption>
              <thead>
                <tr className="text-left text-xs uppercase tracking-wider text-forest-400">
                  <th scope="col" className="pb-2 font-medium">Day</th>
                  <th scope="col" className="pb-2 font-medium">Enquiries</th>
                </tr>
              </thead>
              <tbody>
                {timeline.filter((row) => row.count > 0).length === 0 ? (
                  <tr className="border-t border-forest-800">
                    <td colSpan={2} className="py-3 text-forest-400">
                      No enquiries in this window.
                    </td>
                  </tr>
                ) : (
                  timeline
                    .filter((row) => row.count > 0)
                    .map((row) => (
                      <tr key={row.date} className="border-t border-forest-800">
                        <td className="py-2 text-forest-200">
                          {formatDayLabel(row.date)}
                        </td>
                        <td className="py-2 text-bone">{row.count}</td>
                      </tr>
                    ))
                )}
              </tbody>
            </table>
          </Panel>
        </div>
      )}
    </section>
  );
}
