import { NextResponse } from "next/server";
import Groq from "groq-sdk";
import {
  CHAT_MODEL,
  SYSTEM_PROMPT,
  validateConversation,
  normaliseAiReply,
} from "@/lib/chatPrompt";

// POST /api/chat
//
// Flow: parse -> validate -> call Groq -> normalise -> respond.
//
// This route is the only place the Groq API key is ever read. Route handlers
// run exclusively on the server, so GROQ_API_KEY is never bundled for the
// browser - which is why it must NOT be prefixed with NEXT_PUBLIC_.
//
// The route is stateless: the browser keeps the conversation and posts all of
// it back each turn. That keeps it working on serverless, where consecutive
// requests may land on completely different instances with no shared memory.

// Shown to the visitor whenever the AI call fails for any reason. Deliberately
// vague - the real cause is logged for us, never returned to the client, so we
// leak neither our provider's error text nor whether a key is configured.
const FALLBACK_MESSAGE =
  "Sorry, I could not reach our trip planner just now. Please try again in a moment, or use the enquiry form and a travel expert will get back to you within 24 hours.";

const RATE_LIMIT_MESSAGE =
  "Our trip planner is a little busy right now. Give it a few seconds and send that again.";

function fallback(message, status) {
  return NextResponse.json(
    { success: false, message, fallback: true },
    { status }
  );
}

export async function POST(request) {
  // 1. Parse. A malformed body is the client's fault, so it is a 400.
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, message: "Request body must be valid JSON." },
      { status: 400 }
    );
  }

  // 2. Validate the conversation. The client owns the chat history, so it can
  // send us anything at all - an oversized array, forged roles, a huge string.
  // These caps are what stop a hand-written request from running up our Groq
  // quota. We forward only the cleaned messages, never the raw body.
  const { isValid, error, messages } = validateConversation(body);

  if (!isValid) {
    return NextResponse.json({ success: false, message: error }, { status: 400 });
  }

  // 3. Check the key here rather than at import time, so a missing variable
  // surfaces as a handled fallback response instead of crashing the build.
  // Same reasoning as the MONGODB_URI check in lib/mongodb.js.
  const apiKey = process.env.GROQ_API_KEY;

  if (!apiKey) {
    console.error("GROQ_API_KEY is not defined. Add it to .env.local.");
    return fallback(FALLBACK_MESSAGE, 500);
  }

  // 4. Call Groq. The system prompt is prepended server-side on every request,
  // so it stays out of the client bundle and a visitor cannot replace it by
  // editing the messages they post.
  try {
    const groq = new Groq({ apiKey });

    const completion = await groq.chat.completions.create({
      model: CHAT_MODEL,
      messages: [{ role: "system", content: SYSTEM_PROMPT }, ...messages],
      // Asks Groq to guarantee syntactically valid JSON. It does not guarantee
      // our particular shape, which is what normaliseAiReply is for.
      response_format: { type: "json_object" },
      // Low enough to follow the format reliably, high enough to not sound
      // robotic on the conversational turns.
      temperature: 0.7,
      // A 14-day itinerary with four fields per day needs room.
      max_tokens: 2048,
    });

    const raw = completion.choices?.[0]?.message?.content;

    if (!raw) {
      console.error("Groq returned an empty completion.");
      return fallback(FALLBACK_MESSAGE, 502);
    }

    // JSON mode makes this parse very unlikely to throw, but "very unlikely"
    // is not "never" and an uncaught throw here would be a 500 with no
    // friendly message.
    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch {
      console.error("Groq returned content that was not valid JSON:", raw);
      return fallback(FALLBACK_MESSAGE, 502);
    }

    const reply = normaliseAiReply(parsed);

    if (!reply) {
      console.error("Groq reply did not match the expected shape:", parsed);
      return fallback(FALLBACK_MESSAGE, 502);
    }

    return NextResponse.json({ success: true, ...reply }, { status: 200 });
  } catch (err) {
    // Log the real error for us; return a friendly message to the visitor.
    console.error("Groq chat completion failed:", err);

    // Rate limits and quota exhaustion are worth a distinct message, because
    // unlike the other failures they genuinely are worth retrying.
    if (err?.status === 429) {
      return fallback(RATE_LIMIT_MESSAGE, 429);
    }

    // 401/403 means the key is missing or wrong. That is our problem to fix,
    // and the visitor must not be told which it is.
    return fallback(FALLBACK_MESSAGE, 502);
  }
}
