"use client";

import { useState } from "react";
import { BarChart3, Inbox, Map } from "lucide-react";
import AdminEnquiries from "@/components/AdminEnquiries";
import AdminDestinations from "@/components/AdminDestinations";
import AdminAnalytics from "@/components/AdminAnalytics";

// Tabs for the dashboard.
//
// Only the active section is mounted, so opening the dashboard does not fetch
// enquiries, destinations and analytics all at once. Each section loads its
// own data the first time it is shown.

const TABS = [
  { id: "enquiries", label: "Enquiries", icon: Inbox },
  { id: "destinations", label: "Destinations", icon: Map },
  { id: "analytics", label: "Analytics", icon: BarChart3 },
];

export default function AdminDashboard() {
  const [active, setActive] = useState("enquiries");

  return (
    <div className="mx-auto max-w-6xl px-5 py-10 sm:px-8 sm:py-14">
      <nav
        aria-label="Dashboard sections"
        className="flex flex-wrap gap-2 border-b border-forest-800 pb-4"
      >
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = active === tab.id;

          return (
            <button
              key={tab.id}
              type="button"
              aria-current={isActive ? "page" : undefined}
              onClick={() => setActive(tab.id)}
              className={`inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-medium transition ${
                isActive
                  ? "bg-forest-700 text-bone"
                  : "text-forest-300 hover:bg-forest-800/60 hover:text-forest-100"
              }`}
            >
              <Icon className="h-4 w-4" aria-hidden="true" />
              {tab.label}
            </button>
          );
        })}
      </nav>

      <div className="mt-10">
        {active === "enquiries" && <AdminEnquiries />}
        {active === "destinations" && <AdminDestinations />}
        {active === "analytics" && <AdminAnalytics />}
      </div>
    </div>
  );
}
