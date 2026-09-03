import AdminGate from "@/components/AdminGate";

export const metadata = {
  title: "Admin Dashboard | Travel Unbounded",
  robots: { index: false, follow: false },
};

// The dashboard itself is built next. For now this confirms the whole auth
// loop works end to end: sign in, the server agrees the session is valid, and
// sign out returns to the login page.
export default function AdminPage() {
  return (
    <AdminGate>
      <div className="mx-auto max-w-6xl px-5 py-14 sm:px-8 sm:py-20">
        <h1 className="font-serif text-3xl text-bone sm:text-4xl">Dashboard</h1>
        <p className="mt-3 max-w-xl leading-relaxed text-forest-200">
          You are signed in and the server has confirmed your session.
        </p>

        <div className="mt-10 grid gap-4 sm:grid-cols-3">
          {[
            { title: "Enquiries", note: "Table, filters and status updates" },
            { title: "Destinations", note: "Create, edit and remove" },
            { title: "Analytics", note: "Enquiries over time and by status" },
          ].map((panel) => (
            <div
              key={panel.title}
              className="rounded-2xl border border-forest-700 bg-forest-800/40 p-6"
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
