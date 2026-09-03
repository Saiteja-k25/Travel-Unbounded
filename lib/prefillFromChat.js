// Bridges Sarathi's conversation over to the enquiry form.
//
// The chatbot collects loose, human phrasing - "6 days", "Two of us",
// "around 40000 each", "early March". The enquiry form needs strict values: an
// integer count, a night count in range, a destination that exactly matches
// one we offer, and a future YYYY-MM-DD date. These functions do that
// translation, and deliberately return nothing at all rather than guess badly:
// a wrong value in a prefilled form is worse than an empty field, because the
// visitor may submit it without looking.
//
// Pure string work with no imports at all, so this is safe on both the client
// (the widget builds the link) and the server (the contact page reads it back).
//
// Note where the destination matching happens. The widget only puts the raw
// text it heard into a `place` parameter; matching that against the
// destinations we actually offer is done on the CONTACT PAGE, because the list
// now lives in MongoDB and only the server can read it. Doing it here would
// have meant fetching that list into the browser on every page just so the
// widget could match a name it is about to hand straight back to the server.

// The query parameters we put on the /contact link. Note what is NOT here:
// nothing about budget, and no personal details of any kind - Sarathi never
// collects a name, email or phone, so none can end up in a URL.
const PREFILL_KEYS = ["place", "people", "nights", "date"];

// Upper bound on the free-text `place` parameter, so a long conversation
// cannot build an unreasonable URL.
const MAX_PLACE_LENGTH = 120;

// The slots Sarathi fills, searched together when looking for a destination
// name. Mirrors TRIP_SLOTS in lib/chatPrompt.js, restated here because that
// module holds the system prompt and must never be imported by client code.
const TRIP_SLOT_KEYS = [
  "destinationType",
  "budget",
  "travelers",
  "duration",
  "interests",
  "dates",
];

const MONTHS = [
  "january",
  "february",
  "march",
  "april",
  "may",
  "june",
  "july",
  "august",
  "september",
  "october",
  "november",
  "december",
];

function asText(value) {
  return typeof value === "string" ? value.trim() : "";
}

// First whole number in a string, or null. Used on Sarathi's prose, where the
// number is embedded in words: "3 adults", "6 nights". "Two of us" has no
// digits and correctly yields null rather than a wrong guess.
function firstInteger(text) {
  const match = text.match(/\d+/);
  if (!match) return null;
  const parsed = Number.parseInt(match[0], 10);
  return Number.isInteger(parsed) ? parsed : null;
}

// Used on values read back out of the URL, where the whole string must be a
// plain positive integer and nothing else.
//
// firstInteger is deliberately not used here: it scans for digits anywhere, so
// it reads "-5" as 5 and would quietly turn a nonsense URL into a valid-looking
// field. Reading loose prose and reading a query parameter are different jobs.
function strictInteger(text) {
  if (!/^\d+$/.test(text)) return null;
  const parsed = Number.parseInt(text, 10);
  return Number.isInteger(parsed) ? parsed : null;
}

// Matches free text against the destinations we actually sell. "Mountains in
// Himachal" should find "Himachal Pradesh", so a match on the first word of a
// multi-word name counts too. The list is passed in because it comes from the
// database, which only the server can read.
function matchDestination(text, allowedDestinations) {
  const haystack = text.toLowerCase();
  if (!haystack || !Array.isArray(allowedDestinations)) return null;

  for (const name of allowedDestinations) {
    const needle = name.toLowerCase();
    if (haystack.includes(needle)) return name;

    const firstWord = needle.split(" ")[0];
    // Word-boundary match so "goa" does not match inside another word.
    if (firstWord.length > 3 && new RegExp(`\\b${firstWord}\\b`).test(haystack)) {
      return name;
    }
  }

  return null;
}

// Turns "early March" into the next 1st of March that is still in the future.
//
// The year is our inference, not something the visitor said, so this is a
// best guess. It is offered anyway because dateOfTravel is a required field
// the visitor must look at before submitting, and it lands in a visible,
// editable input rather than being sent anywhere on its own.
function guessFutureDate(text) {
  const haystack = text.toLowerCase();

  const monthIndex = MONTHS.findIndex((month) => haystack.includes(month));
  if (monthIndex === -1) return null;

  // "early" / "mid" / "late" are common enough to be worth honouring.
  let day = 1;
  if (haystack.includes("mid")) day = 15;
  else if (haystack.includes("late") || haystack.includes("end")) day = 25;

  const today = new Date();
  let year = today.getFullYear();

  // If that date has already passed this year, they must mean next year.
  const candidate = new Date(year, monthIndex, day);
  if (candidate <= today) year += 1;

  const iso = `${year}-${String(monthIndex + 1).padStart(2, "0")}-${String(
    day
  ).padStart(2, "0")}`;

  return iso;
}

// Builds the query string the widget appends to /contact. Only keys we could
// resolve are included, so the URL stays short and honest about what we know.
export function buildChatPrefillQuery(collected = {}, itinerary = null) {
  const params = new URLSearchParams();

  // Candidate text that might name a place, most reliable first.
  //
  // The itinerary's own destination field is the best source: it names a real
  // place ("Maasai Mara, Kenya"). The collected slots are weaker, because the
  // model puts the category in destinationType ("beach", "mountains") and can
  // drop the place the visitor actually named - "a 4 day beach trip in Goa"
  // comes back as destinationType: "beach" with Goa nowhere at all. Including
  // every slot recovers it when it does appear somewhere.
  const place = [
    asText(itinerary?.destination),
    asText(itinerary?.title),
    ...TRIP_SLOT_KEYS.map((key) => asText(collected[key])),
  ]
    .filter(Boolean)
    .join(" ")
    // Capped so a long conversation cannot produce an absurd URL.
    .slice(0, MAX_PLACE_LENGTH);

  if (place) params.set("place", place);

  const people = firstInteger(asText(collected.travelers));
  if (people !== null && people >= 1 && people <= 50) {
    params.set("people", String(people));
  }

  const nights = firstInteger(asText(collected.duration));
  if (nights !== null && nights >= 1 && nights <= 90) {
    params.set("nights", String(nights));
  }

  const date = guessFutureDate(asText(collected.dates));
  if (date) params.set("date", date);

  return params.toString();
}

// Reads those params back on the contact page and returns partial form state.
// Everything is re-checked here rather than trusted: the URL is user-editable,
// so someone can type whatever they like into it. Anything that fails a check
// is simply left out, and the field renders empty as usual.
export function parseChatPrefill(searchParams = {}, allowedDestinations = null) {
  const values = {};

  const read = (key) => {
    const raw = searchParams[key];
    // Next gives an array if a param is repeated; take the first.
    return asText(Array.isArray(raw) ? raw[0] : raw);
  };

  // `place` is free text from the conversation, so it is never used directly.
  // It is matched against the destinations currently in the database, and only
  // an exact name from that list is ever put into the form.
  const place = read("place").slice(0, MAX_PLACE_LENGTH);
  const destination = matchDestination(place, allowedDestinations);
  if (destination) values.destination = destination;

  const people = strictInteger(read("people"));
  if (people !== null && people >= 1 && people <= 50) {
    values.numberOfPeople = String(people);
  }

  const nights = strictInteger(read("nights"));
  if (nights !== null && nights >= 1 && nights <= 90) {
    values.tripDurationNights = String(nights);
  }

  const date = read("date");
  // Must be a real, correctly-formatted date that is still in the future -
  // the same rule validateEnquiry applies.
  if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    const parsed = new Date(`${date}T00:00:00`);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (!Number.isNaN(parsed.getTime()) && parsed > today) {
      values.dateOfTravel = date;
    }
  }

  return values;
}

export { PREFILL_KEYS };
