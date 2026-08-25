import Link from "next/link";
import { MapPin } from "lucide-react";
import Container from "./Container";
import { offices } from "@/data/offices";

const quickLinks = [
  { href: "/", label: "Home" },
  { href: "/about", label: "About Us" },
  { href: "/contact", label: "Plan Your Trip" },
];

export default function Footer() {
  return (
    <footer className="mt-auto bg-forest-900 text-forest-100">
      <Container className="py-14">
        <div className="grid gap-10 md:grid-cols-3">
          <div>
            <p className="font-serif text-2xl text-bone">
              Travel <span className="text-clay-300">Unbounded</span>
            </p>
            <p className="mt-3 max-w-xs text-sm leading-relaxed text-forest-200">
              India&rsquo;s most trusted experiential travel experts. Every
              destination we recommend has been personally experienced by our
              team.
            </p>
          </div>

          <div>
            <h2 className="text-sm font-semibold uppercase tracking-widest text-clay-300">
              Quick Links
            </h2>
            <ul className="mt-4 space-y-2 text-sm">
              {quickLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-forest-200 transition hover:text-bone"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h2 className="text-sm font-semibold uppercase tracking-widest text-clay-300">
              Our Offices
            </h2>
            <ul className="mt-4 space-y-4 text-sm">
              {offices.map((office) => (
                <li key={office.id} className="flex gap-2">
                  <MapPin
                    className="mt-0.5 h-4 w-4 shrink-0 text-clay-300"
                    aria-hidden="true"
                  />
                  <div>
                    <p className="font-medium text-bone">{office.city}</p>
                    <p className="text-forest-200">{office.addressLines[0]}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-12 border-t border-forest-800 pt-6 text-sm text-forest-200">
          <p>
            &copy; {new Date().getFullYear()} Travel Unbounded. All rights
            reserved.
          </p>
        </div>
      </Container>
    </footer>
  );
}
