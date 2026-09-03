import AdminGate from "@/components/AdminGate";
import AdminEnquiries from "@/components/AdminEnquiries";

export const metadata = {
  title: "Admin Dashboard | Travel Unbounded",
  robots: { index: false, follow: false },
};

export default function AdminPage() {
  return (
    <AdminGate>
      <div className="mx-auto max-w-6xl px-5 py-12 sm:px-8 sm:py-16">
        <AdminEnquiries />

        {/* Destinations CRUD and analytics land here next. */}
        <div className="mt-14 grid gap-4 sm:grid-cols-2">
          {[
            { title: "Destinations", note: "Create, edit and remove destinations" },
            { title: "Analytics", note: "Enquiries over time and by status" },
          ].map((panel) => (
            <div
              key={panel.title}
              className="rounded-2xl border border-dashed border-forest-700 bg-forest-800/20 p-6"
            >
              <h2 className="font-serif text-xl text-bone">{panel.title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-forest-300">
                {panel.note}
              </p>
              <p className="mt-4 text-xs uppercase tracking-widest text-clay-300">
                Coming next
              </p>
            </div>
          ))}
        </div>
      </div>
    </AdminGate>
  );
}
