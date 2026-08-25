"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import DestinationCard from "./DestinationCard";

// Horizontal card slider.
//
// Touch devices already scroll this natively, so pointer dragging is enabled
// for mouse only - handling both would move the track twice per gesture.
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

  // A native passive listener on the track itself, rather than React's onScroll
  // synthetic event, which does not fire for programmatic scrolling here.
  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;

    updateArrows();
    track.addEventListener("scroll", updateArrows, { passive: true });
    window.addEventListener("resize", updateArrows);

    return () => {
      track.removeEventListener("scroll", updateArrows);
      window.removeEventListener("resize", updateArrows);
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

    const track = trackRef.current;
    drag.current = {
      active: true,
      startX: event.clientX,
      startScroll: track.scrollLeft,
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

  // A drag that ends on top of a card would otherwise fire that card's link.
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
        className={`no-scrollbar -mx-6 flex snap-x snap-proximity gap-6 overflow-x-auto scroll-pl-6 px-6 pb-2 ${
          isDragging ? "cursor-grabbing select-none snap-none" : "cursor-grab"
        }`}
      >
        {destinations.map((destination) => (
          <li
            key={destination.id}
            className="w-[278px] shrink-0 snap-start sm:w-[320px] lg:w-[352px]"
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
