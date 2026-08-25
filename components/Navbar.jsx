"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import Container from "./Container";

const navLinks = [
  { href: "/", label: "Home" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Plan Your Trip" },
];

export default function Navbar() {
  // This component needs useState for the mobile menu, which is why it is a
  // client component. Everything else on the site renders on the server.
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-sand bg-bone/95 backdrop-blur">
      <Container>
        <nav className="flex h-16 items-center justify-between sm:h-20">
          <Link href="/" className="font-serif text-xl text-forest-800 sm:text-2xl">
            Travel <span className="text-clay-700">Unbounded</span>
          </Link>

          {/* Desktop links */}
          <ul className="hidden items-center gap-8 md:flex">
            {navLinks.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="text-sm font-medium text-ink-soft transition hover:text-forest-700"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>

          {/* Mobile toggle */}
          <button
            type="button"
            onClick={() => setIsMenuOpen((open) => !open)}
            aria-expanded={isMenuOpen}
            aria-label={isMenuOpen ? "Close menu" : "Open menu"}
            className="rounded-md p-2 text-forest-800 transition hover:bg-forest-50 md:hidden"
          >
            {isMenuOpen ? (
              <X className="h-6 w-6" aria-hidden="true" />
            ) : (
              <Menu className="h-6 w-6" aria-hidden="true" />
            )}
          </button>
        </nav>

        {/* Mobile menu panel */}
        {isMenuOpen && (
          <ul className="flex flex-col gap-1 border-t border-sand py-3 md:hidden">
            {navLinks.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  onClick={() => setIsMenuOpen(false)}
                  className="block rounded-md px-2 py-3 text-base font-medium text-ink-soft transition hover:bg-forest-50 hover:text-forest-700"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Container>
    </header>
  );
}
