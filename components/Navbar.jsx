"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Menu, X } from "lucide-react";
import Container from "./Container";
import Logo from "./Logo";
import { offices } from "@/data/offices";

// One navigation for every screen size: a hamburger at the top right that
// opens a panel over the right half of the screen.
const primaryLinks = [
  { label: "Home", href: "/", description: "Destinations across India and beyond" },
  { label: "About", href: "/about", description: "Our story, offices and values" },
  { label: "Contact", href: "/contact", description: "Start planning your journey" },
];

const sectionLinks = [
  { label: "India Destinations", href: "/#india" },
  { label: "International", href: "/#international" },
];

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const closeButtonRef = useRef(null);
  const openButtonRef = useRef(null);

  // Escape closes the panel.
  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key === "Escape") setIsOpen(false);
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Freeze the page behind the panel and move focus into it. On close, focus
  // returns to the button that opened it.
  useEffect(() => {
    if (!isOpen) return;

    // Captured now so the cleanup restores focus to the same button, even if
    // the ref has moved on by then.
    const buttonToRefocus = openButtonRef.current;
    const root = document.documentElement;
    const previousOverflow = root.style.overflow;
    const previousPadding = root.style.paddingRight;

    // Hiding the scrollbar reclaims its width and shifts the whole page
    // sideways, so replace it with padding of exactly the same width. On
    // browsers with overlay scrollbars this measures 0 and nothing is added.
    const scrollbarWidth = window.innerWidth - root.clientWidth;

    root.style.overflow = "hidden";
    if (scrollbarWidth > 0) {
      root.style.paddingRight = `${scrollbarWidth}px`;
    }
    closeButtonRef.current?.focus();

    return () => {
      root.style.overflow = previousOverflow;
      root.style.paddingRight = previousPadding;
      buttonToRefocus?.focus();
    };
  }, [isOpen]);

  function close() {
    setIsOpen(false);
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

          <button
            ref={openButtonRef}
            type="button"
            onClick={() => setIsOpen(true)}
            aria-expanded={isOpen}
            aria-controls="site-menu"
            className="group flex items-center gap-3 rounded-full border border-forest-200 py-2.5 pl-5 pr-2.5 transition hover:border-forest-700"
          >
            <span className="text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-forest-800">
              Menu
            </span>
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-forest-700 text-bone transition group-hover:bg-forest-800">
              <Menu className="h-4 w-4" aria-hidden="true" />
            </span>
          </button>
        </nav>
      </Container>

      {/* Slide-over panel. Kept mounted so it animates in both directions;
          pointer events are switched off and it is clipped while closed. */}
      <div
        className={`fixed inset-0 z-[60] overflow-hidden ${
          isOpen ? "" : "pointer-events-none"
        }`}
      >
        <div
          onClick={close}
          aria-hidden="true"
          className={`absolute inset-0 bg-forest-900/60 backdrop-blur-sm transition-opacity duration-500 ${
            isOpen ? "opacity-100" : "opacity-0"
          }`}
        />

        <aside
          id="site-menu"
          role="dialog"
          aria-modal="true"
          aria-label="Site menu"
          className={`absolute right-0 top-0 flex h-full w-1/2 min-w-[300px] max-w-3xl flex-col bg-forest-900 shadow-2xl transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${
            isOpen ? "translate-x-0" : "translate-x-full"
          }`}
        >
          <div className="flex items-center justify-between border-b border-forest-800 px-8 py-6">
            <Logo tone="light" />
            <button
              ref={closeButtonRef}
              type="button"
              onClick={close}
              aria-label="Close menu"
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-forest-700 text-forest-200 transition hover:bg-forest-800 hover:text-bone"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>

          <nav
            aria-label="Site"
            className="flex-1 overflow-y-auto px-8 py-10 sm:py-14"
          >
            <ul className="space-y-2">
              {primaryLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    onClick={close}
                    className="group flex items-baseline justify-between gap-6 rounded-xl px-3 py-4 transition hover:bg-forest-800"
                  >
                    <span>
                      <span className="block font-serif text-3xl text-bone sm:text-4xl">
                        {link.label}
                      </span>
                      <span className="mt-1.5 block text-sm text-forest-300">
                        {link.description}
                      </span>
                    </span>
                    <ArrowUpRight
                      className="h-5 w-5 shrink-0 text-forest-400 transition group-hover:text-clay-300"
                      aria-hidden="true"
                    />
                  </Link>
                </li>
              ))}
            </ul>

            <p className="mt-12 px-3 text-[0.65rem] font-semibold uppercase tracking-[0.22em] text-clay-300">
              Jump to
            </p>
            <ul className="mt-4 space-y-1">
              {sectionLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    onClick={close}
                    className="block rounded-lg px-3 py-2.5 text-forest-200 transition hover:bg-forest-800 hover:text-bone"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <div className="border-t border-forest-800 px-8 py-7">
            <Link
              href="/contact"
              onClick={close}
              className="flex w-full items-center justify-center gap-2 rounded-full bg-clay-600 px-6 py-4 text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-white transition hover:bg-clay-700"
            >
              Book a Journey
            </Link>

            <p className="mt-6 text-[0.65rem] uppercase tracking-[0.2em] text-forest-400">
              {offices.map((office) => office.city).join(" · ")}
            </p>
          </div>
        </aside>
      </div>
    </header>
  );
}
