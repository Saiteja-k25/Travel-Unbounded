// Prompt and input rules for the AI travel chatbot.
//
// This module is imported ONLY by app/api/chat/route.js, which runs on the
// server. The system prompt deliberately never reaches the browser: if it were
// shipped to the client a visitor could read it, and anyone could paste their
// own instructions in its place.
//
// Kept separate from the route for the same reason lib/validateEnquiry.js is
// separate from app/api/enquiry/route.js - the route stays a thin
// parse -> validate -> call -> respond pipeline, and the rules live in one
// place we can reason about on their own.

// The Groq model. Groq retired the Llama 3 / Mixtral models the assignment
// mentions, so this is the most capable chat model their free tier currently
// serves. It is fast (~1s) and reliable with JSON mode, which the itinerary
// output depends on - the Qwen models on the same tier fail to produce valid
// JSON for this prompt.
//
// If this ever 404s with `model_not_found`, Groq has retired it too: run
// `groq.models.list()` and swap in a current id. Nothing else needs to change.
export const CHAT_MODEL = "openai/gpt-oss-120b";

// The six things the assignment asks the bot to collect before it plans.
export const TRIP_SLOTS = [
  "destinationType",
  "budget",
  "travelers",
  "duration",
  "interests",
  "dates",
];

// Guards on the conversation the browser sends us. The client holds the chat
// history and posts all of it back on every turn, so these caps are the only
// thing standing between us and someone replaying a 5,000-message array to
// burn through our Groq quota.
export const MAX_MESSAGES = 40;
export const MAX_CONTENT_LENGTH = 2000;

const ALLOWED_ROLES = ["user", "assistant"];

// The system prompt. Two jobs: hold a natural multi-turn conversation, and
// always answer in one fixed JSON shape so the frontend never has to parse
// prose. `itinerary` stays null while the bot is still asking questions and
// becomes an object once it has enough to plan - that single field is how the
// UI decides between rendering a chat bubble and rendering itinerary cards.
export const SYSTEM_PROMPT = `You are Sarathi, the travel planning assistant for Travel Unbounded, an experiential travel company with offices in Bengaluru, Kochi and Nairobi. You help visitors plan a trip through a short, friendly conversation.

Your name is Sanskrit for the charioteer who steers a journey. If a visitor asks who you are, say you are Sarathi and that you plan trips for Travel Unbounded. Never claim to be a human travel agent.

Your goal is to collect these six things:
1. destinationType - the kind of place they want (beach, mountains, wildlife, city, a named country, etc.)
2. budget - roughly what they want to spend, per person or total
3. travelers - how many people, and whether any are children
4. duration - how many days or nights
5. interests - what they want out of the trip (food, trekking, photography, culture, relaxation, safari, etc.)
6. dates - roughly when they want to travel

CONVERSATION RULES
- Ask about ONE or AT MOST TWO of these per turn. Never interrogate the visitor with a list of six questions.
- Keep every reply under 60 words. Warm and specific, not corporate.
- If the visitor has already told you something, never ask for it again.
- If the visitor is vague, make a sensible assumption, say what you assumed, and move on. Do not stall.
- Answer general travel questions helpfully, then steer gently back to planning.
- If asked something unrelated to travel, say briefly that you only help with trip planning.

WHEN TO BUILD THE ITINERARY
Once you know destinationType, duration and at least three of the six items, stop asking questions and produce the itinerary.

OUTPUT FORMAT
Reply with a single valid JSON object and nothing else. No markdown, no code fences, no text outside the JSON.

{
  "reply": "your conversational message to the visitor",
  "collected": {
    "destinationType": "string or null",
    "budget": "string or null",
    "travelers": "string or null",
    "duration": "string or null",
    "interests": "string or null",
    "dates": "string or null"
  },
  "itinerary": null
}

Set every field in "collected" you have learned so far, using null for anything you still do not know. Carry forward everything from earlier turns.

When you are ready to plan, keep the same shape but fill in "itinerary":

{
  "reply": "a one or two sentence introduction to the plan",
  "collected": { ...as above... },
  "itinerary": {
    "title": "a short name for the trip, e.g. Ten Days in the Kerala Backwaters",
    "destination": "the destination this plan is for",
    "summary": "one sentence on the shape of the trip",
    "estimatedCost": "a rough per-person figure with currency, or null",
    "days": [
      {
        "day": 1,
        "title": "a short title for the day",
        "activity": "what they actually do that day, 1-2 sentences",
        "highlight": "the single standout moment of the day, a few words"
      }
    ]
  }
}

Produce one entry in "days" per day of the trip, numbered from 1, capped at 14 days. Every day needs all four fields.`;

// Checks the conversation posted by the browser before we spend a Groq call on
// it. Returns the cleaned message list so the route sends Groq only values
// that passed these rules, never the raw request body - the same approach
// lib/validateEnquiry.js takes with the enquiry form.
export function validateConversation(input = {}) {
  const { messages } = input;

  if (!Array.isArray(messages)) {
    return { isValid: false, error: "`messages` must be an array." };
  }

  if (messages.length === 0) {
    return { isValid: false, error: "`messages` cannot be empty." };
  }

  if (messages.length > MAX_MESSAGES) {
    return {
      isValid: false,
      error: `Conversation is too long. Please start over.`,
    };
  }

  const cleaned = [];

  for (const message of messages) {
    if (!message || typeof message !== "object") {
      return { isValid: false, error: "Every message must be an object." };
    }

    const { role, content } = message;

    if (!ALLOWED_ROLES.includes(role)) {
      return {
        isValid: false,
        error: "Each message role must be 'user' or 'assistant'.",
      };
    }

    if (typeof content !== "string" || content.trim() === "") {
      return { isValid: false, error: "Each message needs text content." };
    }

    if (content.length > MAX_CONTENT_LENGTH) {
      return {
        isValid: false,
        error: `Messages must be ${MAX_CONTENT_LENGTH} characters or fewer.`,
      };
    }

    // Only role and content go through. Anything else the client attached is
    // dropped rather than forwarded to Groq.
    cleaned.push({ role, content: content.trim() });
  }

  // The browser always appends the visitor's new message before calling us, so
  // an assistant-final conversation means the client is out of step.
  if (cleaned[cleaned.length - 1].role !== "user") {
    return {
      isValid: false,
      error: "The last message must be from the visitor.",
    };
  }

  return { isValid: true, error: null, messages: cleaned };
}

// The model is instructed to return the shape above, but a language model is
// not a schema validator - it can drop a field or return `days` as a string.
// The chat widget renders these values directly, so we force the reply into a
// known shape here rather than letting a malformed response reach React.
//
// Returns null if the payload is too broken to use, which the route turns into
// the friendly fallback message.
export function normaliseAiReply(payload) {
  if (!payload || typeof payload !== "object") return null;

  const reply =
    typeof payload.reply === "string" && payload.reply.trim() !== ""
      ? payload.reply.trim()
      : null;

  if (!reply) return null;

  // Rebuild `collected` slot by slot so the object always has all six keys and
  // never carries extra ones the model invented.
  const collected = {};
  for (const slot of TRIP_SLOTS) {
    const value = payload.collected?.[slot];
    collected[slot] =
      typeof value === "string" && value.trim() !== "" ? value.trim() : null;
  }

  return { reply, collected, itinerary: normaliseItinerary(payload.itinerary) };
}

// An itinerary is only worth rendering if it has at least one usable day, so
// anything short of that becomes null and the reply is shown as a plain
// message instead.
function normaliseItinerary(itinerary) {
  if (!itinerary || typeof itinerary !== "object") return null;
  if (!Array.isArray(itinerary.days)) return null;

  const days = itinerary.days
    .filter((day) => day && typeof day === "object")
    .slice(0, 14) // Matches the cap in the prompt.
    .map((day, index) => ({
      // Trust our own index over the model's numbering so the cards can never
      // come out as "Day 1, Day 1, Day 3".
      day: index + 1,
      title: asText(day.title) ?? `Day ${index + 1}`,
      activity: asText(day.activity) ?? "",
      highlight: asText(day.highlight) ?? "",
    }))
    .filter((day) => day.activity !== "");

  if (days.length === 0) return null;

  return {
    title: asText(itinerary.title) ?? "Your itinerary",
    destination: asText(itinerary.destination) ?? null,
    summary: asText(itinerary.summary) ?? null,
    estimatedCost: asText(itinerary.estimatedCost) ?? null,
    days,
  };
}

function asText(value) {
  return typeof value === "string" && value.trim() !== "" ? value.trim() : null;
}
