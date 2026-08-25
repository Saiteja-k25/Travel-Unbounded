import Link from "next/link";
import { MapPin } from "lucide-react";
import Container from "./Container";
import Logo from "./Logo";
import SocialLinks from "./SocialLinks";
import { offices } from "@/data/offices";

const quickLinks = [
  { href: "/", label: "Home" },
  { href: "/#india", label: "India Destinations" },
  { href: "/#international", label: "International" },
  { href: "/about", label: "About Us" },
  { href: "/contact", label: "Plan Your Trip" },
];

export default function Footer() {
  return (
    <footer className="mt-auto overflow-hidden bg-forest-900 text-forest-100">
      <Container className="pt-16 sm:pt-24">
        <div className="grid grid-cols-2 gap-x-6 gap-y-12 md:grid-cols-3 lg:gap-16">
          <div className="col-span-2 md:col-span-1">
            <Logo tone="light" />
            <p className="mt-6 max-w-xs text-sm leading-relaxed text-forest-200">
              India&rsquo;s most trusted experiential travel experts. Every
              destination we recommend has been personally experienced by our
              team.
            </p>

            <div className="mt-8">
              <SocialLinks />
            </div>
          </div>

          <div>
            <h2 className="text-[0.65rem] font-semibold uppercase tracking-[0.22em] text-clay-300">
              Explore
            </h2>
            <ul className="mt-5 space-y-3 text-sm sm:mt-6">
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
            <h2 className="text-[0.65rem] font-semibold uppercase tracking-[0.22em] text-clay-300">
              Our Offices
            </h2>
            <ul className="mt-5 space-y-5 text-sm sm:mt-6">
              {offices.map((office) => (
                <li key={office.id} className="flex gap-2.5 sm:gap-3">
                  <MapPin
                    className="mt-0.5 h-4 w-4 shrink-0 text-clay-300"
                    aria-hidden="true"
                  />
                  <div className="min-w-0">
                    <p className="font-medium text-bone">{office.city}</p>
                    <p className="mt-0.5 text-xs text-forest-200 sm:text-sm">
                      {office.addressLines[0]}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Container>

      {/* Oversized wordmark. It is decorative, and the accessible name is
          already carried by the logo above, so it is hidden from readers. */}
      <div className="mt-16 select-none overflow-hidden sm:mt-20" aria-hidden="true">
        <p className="whitespace-nowrap text-center font-serif font-semibold leading-[0.78] tracking-[-0.03em] text-forest-800 text-[11.5vw] sm:text-[10.5vw]">
          Travel Unbounded
        </p>
      </div>

      <Container>
        <div className="flex flex-col gap-3 border-t border-forest-800 py-7 text-xs text-forest-200 sm:flex-row sm:items-center sm:justify-between">
          <p>
            &copy; {new Date().getFullYear()} Travel Unbounded. All rights
            reserved.
          </p>
          <p className="tracking-[0.15em] uppercase">
            Bengaluru &middot; Kochi &middot; Nairobi
          </p>
        </div>
      </Container>
    </footer>
  );
}
