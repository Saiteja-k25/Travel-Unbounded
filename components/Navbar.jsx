"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ChevronDown, Menu, X } from "lucide-react";
import Container from "./Container";
import Logo from "./Logo";

// Destinations opens a small menu; everything else is a plain link. The two
// sub-links jump to the matching sections on the home page.
const navLinks = [
  { label: "Home", href: "/" },
  {
    label: "Destinations",
    children: [
      { label: "India", href: "/#india" },
      { label: "International", href: "/#international" },
    ],
  },
  { label: "About", href: "/about" },
  { label: "Contact", href: "/contact" },
];

const linkClasses =
  "text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-ink-soft transition hover:text-forest-700";

export default function Navbar() {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);
  const closeButtonRef = useRef(null);

  // Close the desktop dropdown when clicking anywhere outside it.
  useEffect(() => {
    if (!isDropdownOpen) return;

    function handlePointerDown(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [isDropdownOpen]);

  // Escape closes whichever layer is open.
  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key !== "Escape") return;
      setIsDropdownOpen(false);
      setIsDrawerOpen(false);
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Stop the page behind the drawer from scrolling, and move focus into it.
  useEffect(() => {
    if (!isDrawerOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isDrawerOpen]);

  function closeDrawer() {
    setIsDrawerOpen(false);
  }

  return (
    <header className="sticky top-0 z-50 border-b border-sand/70 bg-bone/90 backdrop-blur-md">
      <Container>
        <nav
          aria-label="Main"
          className="flex h-[72px] items-center justify-between gap-6 sm:h-20"
        >
          <Link href="/" aria-label="Travel Unbounded, home">
            <Logo />
          </Link>

          {/* Desktop navigation */}
          <ul className="hidden items-center gap-9 lg:flex">
            {navLinks.map((link) =>
              link.children ? (
                <li key={link.label} className="relative" ref={dropdownRef}>
                  <button
                    type="button"
                    onClick={() => setIsDropdownOpen((open) => !open)}
                    aria-expanded={isDropdownOpen}
                    aria-haspopup="true"
                    className={`${linkClasses} flex items-center gap-1`}
                  >
                    {link.label}
                    <ChevronDown
                      className={`h-3.5 w-3.5 transition-transform ${
                        isDropdownOpen ? "rotate-180" : ""
                      }`}
                      aria-hidden="true"
                    />
                  </button>

                  {isDropdownOpen && (
                    <ul className="absolute left-0 top-full z-10 mt-4 w-48 overflow-hidden rounded-xl border border-sand bg-white py-2 shadow-lg">
                      {link.children.map((child) => (
                        <li key={child.href}>
                          <Link
                            href={child.href}
                            onClick={() => setIsDropdownOpen(false)}
                            className="block px-4 py-2.5 text-sm text-ink-soft transition hover:bg-forest-50 hover:text-forest-700"
                          >
                            {child.label}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              ) : (
                <li key={link.href}>
                  <Link href={link.href} className={linkClasses}>
                    {link.label}
                  </Link>
                </li>
              )
            )}
          </ul>

          <div className="flex items-center gap-3">
            <Link
              href="/contact"
              className="hidden rounded-full bg-forest-700 px-6 py-3 text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-bone transition hover:bg-forest-800 lg:inline-flex"
            >
              Book a Journey
            </Link>

            <button
              type="button"
              onClick={() => setIsDrawerOpen(true)}
              aria-expanded={isDrawerOpen}
              aria-controls="mobile-menu"
              aria-label="Open menu"
              className="rounded-md p-2 text-forest-800 transition hover:bg-forest-50 lg:hidden"
            >
              <Menu className="h-6 w-6" aria-hidden="true" />
            </button>
          </div>
        </nav>
      </Container>

      {/* Slide-over menu. Kept mounted so it can animate both ways; pointer
          events are switched off while it is closed. */}
      <div
        className={`fixed inset-0 z-[60] overflow-hidden lg:hidden ${
          isDrawerOpen ? "" : "pointer-events-none"
        }`}
      >
        <div
          onClick={closeDrawer}
          aria-hidden="true"
          className={`absolute inset-0 bg-forest-900/60 backdrop-blur-sm transition-opacity duration-300 ${
            isDrawerOpen ? "opacity-100" : "opacity-0"
          }`}
        />

        <aside
          id="mobile-menu"
          role="dialog"
          aria-modal="true"
          aria-label="Site menu"
          className={`absolute right-0 top-0 flex h-full w-1/2 min-w-[288px] max-w-md flex-col bg-forest-900 shadow-2xl transition-transform duration-300 ease-out ${
            isDrawerOpen ? "translate-x-0" : "translate-x-full"
          }`}
        >
          <div className="flex items-center justify-between border-b border-forest-800 px-6 py-5">
            <Logo tone="light" />
            <button
              ref={closeButtonRef}
              type="button"
              onClick={closeDrawer}
              aria-label="Close menu"
              className="rounded-md p-2 text-forest-200 transition hover:bg-forest-800 hover:text-bone"
            >
              <X className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>

          <nav aria-label="Mobile" className="flex-1 overflow-y-auto px-6 py-8">
            <ul className="space-y-1">
              {navLinks.map((link) =>
                link.children ? (
                  <li key={link.label} className="pt-4">
                    <p className="px-2 text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-clay-300">
                      {link.label}
                    </p>
                    <ul className="mt-2 space-y-1">
                      {link.children.map((child) => (
                        <li key={child.href}>
                          <Link
                            href={child.href}
                            onClick={closeDrawer}
                            className="block rounded-lg px-2 py-3 text-lg text-forest-100 transition hover:bg-forest-800 hover:text-bone"
                          >
                            {child.label}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </li>
                ) : (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      onClick={closeDrawer}
                      className="block rounded-lg px-2 py-3 text-lg text-forest-100 transition hover:bg-forest-800 hover:text-bone"
                    >
                      {link.label}
                    </Link>
                  </li>
                )
              )}
            </ul>
          </nav>

          <div className="border-t border-forest-800 p-6">
            <Link
              href="/contact"
              onClick={closeDrawer}
              className="flex w-full items-center justify-center rounded-full bg-clay-600 px-6 py-3.5 text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-white transition hover:bg-clay-700"
            >
              Book a Journey
            </Link>
          </div>
        </aside>
      </div>
    </header>
  );
}
