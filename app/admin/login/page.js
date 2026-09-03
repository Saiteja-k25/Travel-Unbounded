import Container from "@/components/Container";
import AdminLoginForm from "@/components/AdminLoginForm";

export const metadata = {
  title: "Admin Sign In | Travel Unbounded",
  // Keeps the login page out of search results. Not a security measure -
  // the protection is server-side token verification on every admin route -
  // but there is no reason for it to be indexed.
  robots: { index: false, follow: false },
};

export default function AdminLoginPage() {
  return (
    <main className="flex-1 bg-forest-900 py-20 sm:py-28">
      <Container>
        <div className="mx-auto max-w-md">
          <p className="text-xs uppercase tracking-widest text-clay-300">
            Travel Unbounded
          </p>
          <h1 className="mt-3 font-serif text-3xl text-bone sm:text-4xl">
            Admin sign in
          </h1>
          <p className="mt-3 leading-relaxed text-forest-200">
            Enquiries, destinations and analytics for the team.
          </p>

          <div className="mt-8">
            <AdminLoginForm />
          </div>
        </div>
      </Container>
    </main>
  );
}
