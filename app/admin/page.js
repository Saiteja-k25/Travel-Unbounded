import AdminGate from "@/components/AdminGate";
import AdminDashboard from "@/components/AdminDashboard";

export const metadata = {
  title: "Admin Dashboard | Travel Unbounded",
  robots: { index: false, follow: false },
};

export default function AdminPage() {
  return (
    <AdminGate>
      <AdminDashboard />
    </AdminGate>
  );
}
