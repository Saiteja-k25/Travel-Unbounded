"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  AlertCircle,
  MessageCircle,
  PhoneCall,
  RotateCcw,
  Send,
  Sparkles,
  X,
} from "lucide-react";
import ItineraryCards from "./ItineraryCards";
import { buildChatPrefillQuery } from "@/lib/prefillFromChat";

// Sarathi, the floating AI trip-planner widget. Mounted once in app/layout.js
// so it is available on every page.
//
// The name is Sanskrit for the charioteer who steers a journey. It is also set
// in SYSTEM_PROMPT so the assistant introduces itself the same way it is
// labelled here - if you rename it, change both.
//
// This component holds the whole conversation in React state and posts all of
// it to /api/chat on each turn, because that route is deliberately stateless -
// on serverless there is no shared memory between requests to keep it in.
//
// IMPORTANT: this file must never import from lib/chatPrompt.js. That module
// holds SYSTEM_PROMPT, and importing it into a "use client" component would
// bundle the prompt into the browser JavaScript where any visitor could read
// it. The two limits below are therefore restated here rather than shared.
// They exist only to give the visitor a nicer experience than a rejected
// request - the server enforces its own copy, which is the one that matters.
const MAX_MESSAGE_LENGTH = 2000; // Mirrors MAX_CONTENT_LENGTH in lib/chatPrompt.js.
const MAX_MESSAGES = 40; // Mirrors MAX_MESSAGES in lib/chatPrompt.js.

// Shown when the panel is first opened. It is a real assistant turn rather
// than decoration, so it goes into the history the model receives and gives it
// the context that it has already greeted the visitor.
const GREETING = {
  role: "assistant",
  content:
    "Hello, I am Sarathi. I plan trips for Travel Unbounded. Tell me the kind of place you have in mind and I will build you a day-by-day itinerary.",
};

// Offered as one-tap openers so the visitor is not staring at an empty box.
const SUGGESTIONS = [
  "A week in the mountains",
  "Wildlife safari for two",
  "Quiet beach escape",
];

export default function ChatWidget() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([GREETING]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  // Transport and validation problems, shown as a banner above the input.
  // Failures the AI itself reports arrive as a normal assistant turn instead.
  const [error, setError] = useState("");
  // The most recent slots Sarathi has gathered. Kept separately from the
  // messages so the callback link always reflects the latest turn without
  // having to search back through the transcript.
  const [collected, setCollected] = useState(null);

  const scrollRef = useRef(null);
  const inputRef = useRef(null);

  // Once the conversation reaches the server's cap there is no point letting
  // the visitor type another message that is certain to be rejected.
  const isFull = messages.length >= MAX_MESSAGES;

  // Keep the newest message in view as the conversation grows, and while the
  // typing indicator is showing.
  useEffect(() => {
    const element = scrollRef.current;
    if (element) element.scrollTop = element.scrollHeight;
  }, [messages, isLoading]);

  // Move focus into the input when the panel opens, so the visitor can type
  // straight away instead of hunting for the field.
  useEffect(() => {
    if (isOpen) inputRef.current?.focus();
  }, [isOpen]);

  // Escape closes the panel, matching the navigation slide-over in Navbar.jsx.
  useEffect(() => {
    if (!isOpen) return;

    function handleKeyDown(event) {
      if (event.key === "Escape") setIsOpen(false);
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  async function sendMessage(text) {
    const trimmed = text.trim();
    if (!trimmed || isLoading || isFull) return;

    // Show the visitor's message immediately rather than after the response.
    const nextMessages = [...messages, { role: "user", content: trimmed }];

    setMessages(nextMessages);
    setInput("");
    setError("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // Send only role and content. Our own itinerary and isFallback fields
        // are for rendering; the route would strip them anyway, but there is
        // no reason to put them on the wire.
        body: JSON.stringify({
          messages: nextMessages.map(({ role, content }) => ({
            role,
            content,
          })),
        }),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        setMessages((current) => [
          ...current,
          {
            role: "assistant",
            content: result.reply,
            // null while the AI is still asking questions, an object once it
            // has enough to plan. That is what decides bubble vs. cards.
            itinerary: result.itinerary,
          },
        ]);
        setCollected(result.collected);
        return;
      }

      // The route marks its friendly AI failures with `fallback`. Those read
      // better as a message in the conversation than as an error banner.
      if (result.fallback) {
        setMessages((current) => [
          ...current,
          { role: "assistant", content: result.message, isFallback: true },
        ]);
        return;
      }

      // Anything else is a validation rejection, which is a problem with the
      // request rather than something the assistant can answer.
      setError(result.message || "Something went wrong. Please try again.");
    } catch {
      // fetch only throws on network failure, not on a 4xx/5xx response.
      setError("We could not reach the server. Check your connection.");
    } finally {
      setIsLoading(false);
    }
  }

  function handleSubmit(event) {
    event.preventDefault();
    sendMessage(input);
  }

  // "Start over" from the assignment: clears the conversation back to the
  // opening greeting. No server call is needed because the route keeps no
  // state - the history lives here.
  function handleStartOver() {
    setMessages([GREETING]);
    setInput("");
    setError("");
    setCollected(null);
    inputRef.current?.focus();
  }

  // Sarathi cannot take a booking or arrange a call - the enquiry form is the
  // only thing that actually reaches the team - so the callback button hands
  // the visitor over to it, carrying across whatever has been worked out so
  // far. Anything that could not be resolved into a valid form value is simply
  // left out, and that field arrives empty.
  // The most recent itinerary, if one has been produced. Its destination field
  // names a real place, which the collected slots often do not.
  const latestItinerary = [...messages]
    .reverse()
    .find((message) => message.itinerary)?.itinerary;

  const prefillQuery = collected
    ? buildChatPrefillQuery(collected, latestItinerary)
    : "";
  const callbackHref = prefillQuery ? `/contact?${prefillQuery}` : "/contact";

  // The widget is mounted in the root layout, so it would otherwise float over
  // the admin dashboard too. Sarathi is for visitors planning a trip; on an
  // admin screen it is only clutter.
  if (pathname?.startsWith("/admin")) return null;

  return (
    <>
      {/* Launcher. Hidden while the panel is open so it does not sit on top of
          it on mobile, where the panel fills the screen. */}
      {!isOpen && (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          aria-label="Open Sarathi, the AI trip planner"
          className="fixed bottom-5 right-5 z-[55] inline-flex items-center gap-2 rounded-full bg-forest-700 px-5 py-3.5 text-sm font-medium text-white shadow-lg transition hover:bg-forest-800 motion-reduce:transition-none sm:bottom-6 sm:right-6"
        >
          <MessageCircle className="h-5 w-5" aria-hidden="true" />
          <span className="hidden sm:inline">Ask Sarathi</span>
        </button>
      )}

      {isOpen && (
        <div
          role="dialog"
          aria-label="Sarathi, the AI trip planner"
          /* Full screen on mobile, a corner panel from sm up. z-[55] puts it
             above the sticky header (z-50) but below the navigation slide-over
             (z-[60]), so opening the menu covers the chat rather than the two
             overlapping.
             The 7rem in the height cap reserves room for the sticky header
             plus the bottom offset. Without it the panel rides up over the
             header on short viewports - a laptop or a phone in landscape -
             and covers the menu button. */
          className="fixed inset-0 z-[55] flex flex-col bg-bone sm:inset-auto sm:bottom-6 sm:right-6 sm:h-[min(37rem,calc(100vh-7rem))] sm:w-[26rem] sm:rounded-2xl sm:border sm:border-sand sm:shadow-2xl"
        >
          {/* Header */}
          <div className="flex shrink-0 items-center justify-between gap-2 border-b border-sand bg-forest-800 px-4 py-3.5 sm:rounded-t-2xl">
            <div className="flex min-w-0 items-center gap-2.5">
              <Sparkles
                className="h-5 w-5 shrink-0 text-clay-300"
                aria-hidden="true"
              />
              <div className="min-w-0">
                <p className="font-serif text-base leading-tight text-bone">
                  Sarathi
                </p>
                <p className="truncate text-xs text-forest-200">
                  Your trip planner at Travel Unbounded
                </p>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-1">
              <button
                type="button"
                onClick={handleStartOver}
                aria-label="Start over"
                title="Start over"
                className="rounded-full p-2 text-forest-100 transition hover:bg-forest-700"
              >
                <RotateCcw className="h-4 w-4" aria-hidden="true" />
              </button>

              <button
                type="button"
                onClick={() => setIsOpen(false)}
                aria-label="Close Sarathi"
                className="rounded-full p-2 text-forest-100 transition hover:bg-forest-700"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>
          </div>

          {/* Conversation */}
          <div
            ref={scrollRef}
            aria-live="polite"
            className="flex-1 space-y-3 overflow-y-auto px-4 py-4"
          >
            {messages.map((message, index) => (
              <div
                key={index}
                className={
                  message.role === "user" ? "flex justify-end" : "flex flex-col"
                }
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                    message.role === "user"
                      ? "bg-forest-700 text-white"
                      : message.isFallback
                        ? "border border-clay-300 bg-clay-50 text-clay-800"
                        : "border border-sand bg-white text-ink"
                  }`}
                >
                  {message.isFallback && (
                    <AlertCircle
                      className="mb-1.5 h-4 w-4 text-clay-600"
                      aria-hidden="true"
                    />
                  )}
                  {message.content}
                </div>

                {/* An itinerary renders as cards below the message that
                    introduced it, at full panel width. */}
                {message.itinerary && (
                  <ItineraryCards itinerary={message.itinerary} />
                )}
              </div>
            ))}

            {/* Typing indicator */}
            {isLoading && (
              <div className="flex flex-col">
                <div className="inline-flex w-fit items-center gap-2 rounded-2xl border border-sand bg-white px-3.5 py-2.5">
                  <span className="text-xs text-ink-soft">
                    Sarathi is typing
                  </span>

                  {/* The delays stagger the shared typing-wave animation so
                      the dots travel left to right. */}
                  <span className="flex items-center gap-1">
                    {[0, 180, 360].map((delay) => (
                      <span
                        key={delay}
                        className="typing-dot h-1.5 w-1.5 rounded-full bg-forest-500"
                        style={{ animationDelay: `${delay}ms` }}
                      />
                    ))}
                  </span>
                </div>
              </div>
            )}

            {/* One-tap openers, only while the conversation is untouched. */}
            {messages.length === 1 && !isLoading && (
              <div className="flex flex-wrap gap-2 pt-1">
                {SUGGESTIONS.map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() => sendMessage(suggestion)}
                    className="rounded-full border border-forest-300 bg-white px-3 py-1.5 text-xs font-medium text-forest-700 transition hover:bg-forest-50"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Composer */}
          <div className="shrink-0 border-t border-sand bg-white px-4 py-3">
            {error && (
              <p
                role="alert"
                className="mb-2.5 flex items-start gap-2 rounded-lg border border-clay-300 bg-clay-50 p-2.5 text-xs text-clay-800"
              >
                <AlertCircle
                  className="mt-0.5 h-3.5 w-3.5 shrink-0"
                  aria-hidden="true"
                />
                {error}
              </p>
            )}

            {/* Kept outside the isFull branch below so it is reachable at every
                point in the conversation - including once the message limit is
                hit, where handing over to a person matters most. */}
            <Link
              href={callbackHref}
              onClick={() => setIsOpen(false)}
              className="mb-2.5 flex items-center justify-center gap-2 rounded-full border border-clay-300 bg-clay-50 px-4 py-2 text-xs font-medium text-clay-800 transition hover:bg-clay-100"
            >
              <PhoneCall className="h-3.5 w-3.5" aria-hidden="true" />
              Request a callback
            </Link>

            {isFull ? (
              <div className="text-center">
                <p className="text-xs text-ink-soft">
                  This conversation has reached its limit.
                </p>
                <button
                  type="button"
                  onClick={handleStartOver}
                  className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-forest-700 px-4 py-2 text-xs font-medium text-white transition hover:bg-forest-800"
                >
                  <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                  Start over
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="flex items-end gap-2">
                <label htmlFor="chat-input" className="sr-only">
                  Your message
                </label>
                <input
                  id="chat-input"
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  maxLength={MAX_MESSAGE_LENGTH}
                  disabled={isLoading}
                  autoComplete="off"
                  placeholder="Mountains, 6 days, two of us..."
                  className="min-w-0 flex-1 rounded-full border border-sand bg-bone px-4 py-2.5 text-sm text-ink outline-none transition placeholder:text-ink-soft/70 focus:border-forest-400 disabled:opacity-60"
                />

                <button
                  type="submit"
                  disabled={isLoading || input.trim() === ""}
                  aria-label="Send message"
                  className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-clay-600 text-white transition hover:bg-clay-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Send className="h-4 w-4" aria-hidden="true" />
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
