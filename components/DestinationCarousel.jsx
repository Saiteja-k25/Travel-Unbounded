"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import DestinationCard from "./DestinationCard";

// Horizontal card slider: drag with a mouse, swipe on touch, or use the
// arrows. Cards snap into place, and each one tilts slightly in 3D depending
// on how far it sits from the centre of the view.
//
// Pointer dragging is enabled for mouse only - touch devices already scroll
// this natively, and handling both would move the track twice per gesture.

const MAX_TILT_DEGREES = 9;

// Tilts each card according to its distance from the centre of the viewport.
// Kept outside the component: it is plain DOM work that takes the track it
// should operate on, rather than reaching for a ref.
function applyTilt(track) {
  if (!track) return;

  const viewCentre = track.scrollLeft + track.clientWidth / 2;

  for (const item of track.children) {
    const itemCentre = item.offsetLeft + item.offsetWidth / 2;
    // -1 at the far left of the view, 0 in the middle, 1 at the far right.
    const offset = Math.max(
      -1,
      Math.min(1, ((itemCentre - viewCentre) / track.clientWidth) * 2)
    );
    const distance = Math.abs(offset);

    item.style.transform = `perspective(1100px) rotateY(${
      offset * -MAX_TILT_DEGREES
    }deg) translateZ(${-distance * 44}px) scale(${1 - distance * 0.04})`;
    item.style.opacity = String(1 - distance * 0.22);
  }
}

export default function DestinationCarousel({ destinations, label }) {
  const trackRef = useRef(null);
  const drag = useRef({ active: false, startX: 0, startScroll: 0, distance: 0 });

  const [isDragging, setIsDragging] = useState(false);
  const [canScrollBack, setCanScrollBack] = useState(false);
  const [canScrollForward, setCanScrollForward] = useState(true);

  const updateArrows = useCallback(() => {
    const track = trackRef.current;
    if (!track) return;

    const maxScroll = track.scrollWidth - track.clientWidth;
    setCanScrollBack(track.scrollLeft > 8);
    setCanScrollForward(track.scrollLeft < maxScroll - 8);
  }, []);

  // Native passive listener rather than React's onScroll, which does not fire
  // for programmatic scrolling in every environment.
  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;

    function handleScroll() {
      updateArrows();
      applyTilt(track);
    }

    handleScroll();
    track.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", handleScroll);

    return () => {
      track.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleScroll);
    };
  }, [updateArrows]);

  function scrollByOneCard(direction) {
    const track = trackRef.current;
    if (!track) return;

    const firstCard = track.querySelector("li");
    const step = firstCard ? firstCard.offsetWidth + 24 : track.clientWidth;
    track.scrollBy({ left: step * direction, behavior: "smooth" });

    // The scroll listener keeps the arrows in sync, but smooth scrolling
    // finishes after this handler returns, so refresh once it has settled.
    window.setTimeout(updateArrows, 450);
  }

  function handlePointerDown(event) {
    if (event.pointerType !== "mouse") return;

    drag.current = {
      active: true,
      startX: event.clientX,
      startScroll: trackRef.current.scrollLeft,
      distance: 0,
    };
    setIsDragging(true);
  }

  function handlePointerMove(event) {
    if (!drag.current.active) return;

    const deltaX = event.clientX - drag.current.startX;
    drag.current.distance = Math.abs(deltaX);
    trackRef.current.scrollLeft = drag.current.startScroll - deltaX;
  }

  function endDrag() {
    if (!drag.current.active) return;
    drag.current.active = false;
    setIsDragging(false);
  }

  // A drag that ends on top of a card would otherwise open that card's link.
  function handleClickCapture(event) {
    if (drag.current.distance > 6) {
      event.preventDefault();
      event.stopPropagation();
      drag.current.distance = 0;
    }
  }

  return (
    <div className="relative">
      <ul
        ref={trackRef}
        aria-label={label}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={endDrag}
        onPointerLeave={endDrag}
        onClickCapture={handleClickCapture}
        className={`no-scrollbar -mx-6 flex snap-x snap-proximity gap-6 overflow-x-auto scroll-pl-6 px-6 py-4 ${
          isDragging ? "cursor-grabbing select-none" : "cursor-grab"
        }`}
      >
        {destinations.map((destination) => (
          <li
            key={destination.id}
            style={{ willChange: "transform" }}
            // w-full resolves against the track's content box, so on a phone
            // exactly one card fills the viewport instead of one and a half.
            className="w-full shrink-0 snap-start transition-opacity sm:w-[320px] lg:w-[352px]"
          >
            <DestinationCard destination={destination} />
          </li>
        ))}
      </ul>

      {/* Arrows are a convenience on top of scrolling, so they are hidden from
          screen readers, which can already reach every card by tabbing. */}
      <div className="mt-8 flex gap-3" aria-hidden="true">
        <button
          type="button"
          onClick={() => scrollByOneCard(-1)}
          disabled={!canScrollBack}
          tabIndex={-1}
          className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-forest-200 text-forest-700 transition hover:bg-forest-50 disabled:opacity-30 disabled:hover:bg-transparent"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>

        <button
          type="button"
          onClick={() => scrollByOneCard(1)}
          disabled={!canScrollForward}
          tabIndex={-1}
          className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-forest-200 text-forest-700 transition hover:bg-forest-50 disabled:opacity-30 disabled:hover:bg-transparent"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}
