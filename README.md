# Travel Unbounded

A production-style travel company website built for the Travel Unbounded Full Stack Developer assignment, Phases 1 and 2.

- **Live demo:** https://travel-unbounded-omega.vercel.app
- **Repository:** https://github.com/Saiteja-k25/Travel-Unbounded

## Admin test credentials

For the evaluator. Sign in at [`/admin/login`](https://travel-unbounded-omega.vercel.app/admin/login).

| Field | Value |
| --- | --- |
| Email | `admin@gmail.com` |
| Password | `TravelAdmin@123` |

Seeded in Firebase Authentication with Email/Password sign-in enabled.

`/admin` redirects to the login page when signed out, and **every admin API route verifies the session independently** — see [Admin authentication](#admin-authentication) for how to confirm that with `curl` rather than taking it on trust.

## Overview

The public site showcases curated destinations, tells the company story, and captures booking enquiries. Phase 2 adds an AI trip planner and a secure admin dashboard.

```
Phase 1   Booking form → client validation → POST /api/enquiry
                       → server validation → MongoDB → JSON → confirmation UI

Phase 2   Visitor ⇄ Sarathi widget → POST /api/chat → Groq (server-side)
                                   → structured JSON itinerary → cards

          Admin → Firebase sign-in → ID token
                → every /api/... admin route verifies it server-side
                → enquiries, destinations CRUD, analytics
```

Server-side validation is deliberately independent of the browser throughout: every route can be called directly with `curl` and still rejects bad input, because client-side validation proves nothing about what actually reaches the database.

## Tech Stack

| Layer | Choice | Version |
| --- | --- | --- |
| Framework | Next.js (App Router) | 16.3.3 |
| UI | React | 19.2.8 |
| Styling | Tailwind CSS (CSS-first `@theme`, no config file) | 4.3.3 |
| Language | JavaScript (no TypeScript) | — |
| Backend | Next.js API Routes | — |
| Database | MongoDB Atlas | — |
| ODM | Mongoose | 9.9.3 |
| AI | Groq (`groq-sdk`) | 1.6.0 |
| Auth | Firebase Authentication (client + Admin SDK) | 12.18.0 / 13.10.0 |
| Charts | Recharts | 3.10.1 |
| Icons | lucide-react | 1.34.0 |
| Brand icons | react-icons | 5.7.0 |
| Hosting | Vercel | — |

Next.js serves both the pages and the API, so there is no separate backend service, no CORS configuration and a single deployment.

## Features

### Public site

- **Home** — hero, travel-notes band, India destinations, international destinations, word marquee, closing call to action.
- **About** — company story, three office locations, "why choose us".
- **Contact** — the booking enquiry form plus supporting contact details.
- Fully responsive; verified at 375px, 768px, 1024px and 1440px with no horizontal overflow on any page.
- Draggable, snapping destination carousel; slide-over navigation that traps and restores focus; header hides on scroll down and returns on scroll up.
- Per-page SEO titles and descriptions. Custom SVG logo and favicon; no third-party logo files.

### Sarathi — the AI trip planner

A floating widget on every public page. Named after the Sanskrit for the charioteer who steers a journey.

- Collects destination, budget, travellers, duration, interests and dates over a few turns, one or two questions at a time.
- `POST /api/chat` calls Groq **server-side only**. Typing indicator while it thinks; a friendly fallback on any failure, with a distinct message for rate limits.
- Once it has enough, it returns a **day-wise itinerary as JSON** which is rendered as cards — never raw text.
- **Start over** resets the conversation. **Copy** puts the itinerary on the clipboard.
- **Request a callback** hands the visitor to the enquiry form, carrying across what the chat worked out.

### Admin dashboard

- **Enquiries** — every submission with name, email, phone, travel date, travellers, hotel category, status and received date. Filter by status, search by name or email, page through results, and update status (New / Contacted / Converted / Closed).
- **Destinations** — full create, read, update and delete. Edits appear on the public site immediately.
- **Analytics** — enquiries per day over 7/30/90 days, a status breakdown, hotel categories, most asked-about destinations, and a table view of the numbers behind every chart.
- Responsive: the enquiries table becomes one card per enquiry below 1024px.

## Project Structure

```
app/
  layout.js                      Root layout: document shell, fonts, globals.css only
  globals.css                    Tailwind import and the design tokens (@theme)
  favicon.ico, icon.svg          Brand favicon

  (site)/                        Route group — the parentheses are not part of any URL
    layout.js                    Navbar, Footer and Sarathi (public pages only)
    page.js                      /            Home
    about/page.js                /about
    contact/page.js              /contact     Enquiry form, prefilled from a chat

  admin/
    page.js                      /admin       Dashboard (no marketing chrome)
    login/page.js                /admin/login

  api/
    enquiry/route.js             POST   public
    enquiry/[id]/route.js        PATCH  admin — update status
    enquiries/route.js           GET    admin — list, filter, search, page
    destinations/route.js        GET    public · POST admin
    destinations/[id]/route.js   PATCH  admin · DELETE admin
    chat/route.js                POST   public — Groq
    analytics/summary/route.js   GET    admin
    admin/me/route.js            GET    admin — session check

components/                      25 components
  ChatWidget.jsx                 Sarathi: conversation state, typing indicator
  ItineraryCards.jsx             Day-by-day itinerary cards, copy to clipboard
  AdminGate.jsx                  Page-level gate; confirms the session server-side
  AdminLoginForm.jsx             Firebase email/password sign-in
  AdminDashboard.jsx             Tabs; mounts only the active section
  AdminEnquiries.jsx             Table, filters, search, status updates
  AdminDestinations.jsx          CRUD form and cards
  AdminAnalytics.jsx             Recharts charts and the table view
  EnquiryForm.jsx                Form state, validation, loading/success/error UI
  ...

data/
  destinations.js                Seed for the destinations collection, and the
                                 fallback if the database is unreachable
  offices.js                     The three office locations

lib/
  mongodb.js                     Cached Mongoose connection
  destinations.js                Server-side destination reads (SERVER ONLY)
  validateEnquiry.js             Enquiry rules, shared client and server
  validateDestination.js         Destination rules, shared client and server
  chatPrompt.js                  System prompt, input caps, reply normalisation (SERVER ONLY)
  prefillFromChat.js             Turns a chat into enquiry-form values
  firebaseAdmin.js               Admin SDK setup (SERVER ONLY)
  requireAdmin.js                Token verification for admin routes (SERVER ONLY)
  firebaseClient.js              Firebase browser SDK
  adminApi.js                    Attaches the ID token to admin requests

models/
  Enquiry.js                     Booking enquiry, including status
  Destination.js                 Destination

scripts/                         One-off migrations and verification tools
  seedDestinations.mjs           Load the destinations collection from data/
  backfillEnquiryStatus.mjs      Give pre-existing enquiries a status
  checkFirebaseKey.mjs           Diagnose FIREBASE_PRIVATE_KEY without printing it
  checkFirebaseAdmin.mjs         Confirm the service account works
  checkAdminRoute.mjs            Prove the admin lock accepts and rejects correctly
  checkEnquiriesApi.mjs          Enquiries API
  checkDestinationsApi.mjs       Destinations CRUD
  checkAnalyticsApi.mjs          Analytics, including chart-vs-table agreement
```

## Local Setup

Requires Node.js 18.18 or newer.

```bash
git clone https://github.com/Saiteja-k25/Travel-Unbounded.git
cd Travel-Unbounded
npm install
```

Create `.env.local` (see [Environment Variables](#environment-variables)), then load the database:

```bash
npm run seed:destinations -- --apply
```

Both migration scripts are **dry-run without `--apply`**, because they talk to the real Atlas database. Both are safe to run twice: the seed upserts by name, and the backfill only matches documents that have no status.

```bash
npm run dev
```

Open http://localhost:3000.

### Scripts

```bash
npm run dev                      # development server
npm run build                    # production build
npm run start                    # serve the production build
npm run lint                     # ESLint

npm run seed:destinations        # dry run; add -- --apply to write
npm run backfill:status          # dry run; add -- --apply to write

npm run check:firebase-key       # is FIREBASE_PRIVATE_KEY parseable?
npm run check:firebase-admin     # does the service account authenticate?
npm run check:admin-route        # is the admin lock real? (needs the dev server)
npm run check:enquiries-api      # enquiries API
npm run check:destinations-api   # destinations CRUD
npm run check:analytics-api      # analytics, and chart/table agreement
```

The `check:*` scripts need the dev server running. They mint a real Firebase ID token from the service account, so they exercise the genuine auth path without anyone typing a password. Each cleans up whatever it creates.

## Environment Variables

Copy `.env.example` to `.env.local` and fill in the values.

| Variable | Required | Public? | Description |
| --- | --- | --- | --- |
| `MONGODB_URI` | Yes | No | Atlas connection string, **including the database name** |
| `GROQ_API_KEY` | Yes | No | Groq API key for the chatbot |
| `NEXT_PUBLIC_FIREBASE_API_KEY` | Yes | **Yes** | Firebase web config |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | Yes | **Yes** | Firebase web config |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | Yes | **Yes** | Firebase web config |
| `FIREBASE_PROJECT_ID` | Yes | No | Service account `project_id` |
| `FIREBASE_CLIENT_EMAIL` | Yes | No | Service account `client_email` |
| `FIREBASE_PRIVATE_KEY` | Yes | No | Service account `private_key` |

### Why three of them are public on purpose

The `NEXT_PUBLIC_FIREBASE_*` values are **meant** to reach the browser. The Firebase client SDK is designed to run in untrusted browsers, and these identify the project rather than authorise anything; protection comes from Firebase Auth rules plus our own server-side token verification. That is exactly why they carry the prefix and the other five do not.

`GROQ_API_KEY` and the three `FIREBASE_*` service-account values are **server-only**. They are read inside route handlers, which never run in the browser. Confirmed against a production build: no chunk under `.next/static` contains the Groq key, the private key, the service account email, the connection string, the model id, or the system prompt.

### `FIREBASE_PRIVATE_KEY` — the one that catches people

In the service account JSON the key is one long string where `\n` appears as **two literal characters**. Copy it exactly as it appears there, wrapped in double quotes:

```
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEv...\n-----END PRIVATE KEY-----\n"
```

- Keep every `\n` as written — do not press Enter to make real line breaks.
- **Do not include the trailing comma** from the JSON line. The comma sits after the closing quote, which stops the env loader treating the value as quoted, so the quotes end up inside the string and OpenSSL rejects the key with the unhelpful `DECODER routines::unsupported`.
- On Vercel, paste it into the field **without** the surrounding quotes.

`lib/firebaseAdmin.js` strips stray quotes and trailing commas anyway, and `npm run check:firebase-key` reports on all of this without printing the key.

Other notes:

- `.env.local` is gitignored and has never been committed. `.env.example` is committed with placeholders.
- If the Mongo password contains `@`, `#`, `/` or `:` it must be URL-encoded.
- Include the database name in the URI path, otherwise Mongoose connects to `test`.
- Service account JSON downloads are gitignored (`*serviceaccount*.json`, `firebase-adminsdk*.json`). That file is full admin access to the Firebase project — delete it once the values are in `.env.local`.
- Atlas **Network Access** must allow `0.0.0.0/0`, because Vercel's outbound IPs are not fixed.

## AI Integration

**Provider: [Groq](https://console.groq.com).** Model: **`openai/gpt-oss-120b`**.

The assignment lists Groq as offering "Llama 3 / Mixtral". **Groq has since retired both.** Of the chat models its free tier now serves, `gpt-oss-120b` is the most capable and the most reliable with JSON mode — the Qwen models on the same tier fail to produce valid JSON for this prompt. If it ever returns `model_not_found`, Groq has retired it too: run `groq.models.list()` and swap the id in `lib/chatPrompt.js`. Nothing else needs to change.

**The key is only ever read server-side**, inside `app/api/chat/route.js`. So is the system prompt, which means a visitor cannot read it or replace it by editing the messages they post.

**Validation on both sides of the AI call.** The browser holds the conversation and posts all of it back each turn, so inbound requests are capped at 40 messages and 2,000 characters each, roles are restricted to `user`/`assistant`, and only `role` and `content` are forwarded. Without those caps a hand-written request could replay a 5,000-message array against the quota. Outbound, replies are forced into a known shape: Groq's JSON mode guarantees valid JSON but not *our* schema, and the itinerary is rendered directly by React, so a missing field or a mis-typed `days` array would otherwise reach the UI.

**What Sarathi will not do.** It states plainly that it cannot register details or arrange contact, and points people to the enquiry form — the only thing that actually reaches the team. This is deliberate: asked "will someone call me?", an earlier version replied "our team will call you shortly", which was fiction. Nothing had been recorded and the transcript only exists in the visitor's tab. Prices are labelled as rough estimates, not quotes, for the same reason.

## Admin authentication

Firebase Authentication, with **two separate layers**:

1. **`AdminGate` on the page** — visiting `/admin` while signed out redirects to the login page. This is convenience only; it stops an honest person, not an attacker.
2. **`requireAdmin()` on every admin API route** — verifies the Firebase ID token server-side before the database is touched. **This is the layer that actually protects the data.**

The distinction matters because an attacker does not open `/admin` in a browser. They send a request straight to the API, which never loads the React app, so no page-level check ever runs. You can confirm the second layer yourself:

```bash
curl -i https://travel-unbounded-omega.vercel.app/api/enquiries
# HTTP/1.1 401 Unauthorized
# {"success":false,"message":"This endpoint requires an admin session.","code":"missing_token"}
```

Every admin route answers the same way when called with its own method — `GET /api/enquiries`, `PATCH /api/enquiry/:id`, `POST /api/destinations`, `PATCH` and `DELETE /api/destinations/:id`, `GET /api/analytics/summary`, `GET /api/admin/me`. (A `GET` to a PATCH-only route returns `405 Method Not Allowed` rather than `401`, since there is no such handler to authenticate against.)

`npm run check:admin-route` goes further, testing a genuine minted token against nine attacks: no header, empty `Bearer`, garbage, Basic auth, a token with no `Bearer` prefix, a tampered signature, a stripped signature, **a forged payload carrying a real signature**, and **`alg: none`**. All nine return 401; the genuine token returns 200.

Two implementation notes:

- **A helper, not `middleware.js`.** Next middleware runs on the Edge runtime, which lacks the Node crypto the Admin SDK needs to check a signature — verification cannot happen there at all. Per-route also means a route is only reachable if it has explicitly opted in, rather than relying on one gate nobody forgets to configure.
- **Tokens are verified with `checkRevoked`.** That costs a call to Google per request and buys immediate lockout; without it a token stays valid for up to an hour after an account is disabled.

**No password is ever stored or seen by this application.** The client SDK sends credentials straight to Google and returns an ID token. Wrong email and wrong password give the same message, so the form never reveals which accounts exist.

**`firebase-admin` is pinned to 13.x on purpose.** Version 14 pulls `jwks-rsa@4`, which is CommonJS but depends on the ESM-only `jose@6`. Node 22 tolerates `require()` of an ES module, so it loads locally; Vercel runs Node 24 and loads the package through its external-module wrapper, where it does not — every route importing `lib/requireAdmin.js` returned an empty `500` in production while passing locally, including in a local production build. `firebase-admin@13.10` pulls `jwks-rsa@3` → `jose@4`, which is CommonJS, so the conflict is gone rather than worked around. Do not upgrade to 14 without re-checking this on a real deployment.

## API

Public routes are unauthenticated. Admin routes require `Authorization: Bearer <firebase-id-token>` and return `401` without one.

| Route | Method | Access | Purpose |
| --- | --- | --- | --- |
| `/api/enquiry` | POST | Public | Submit a booking enquiry |
| `/api/chat` | POST | Public | Sarathi conversation turn |
| `/api/destinations` | GET | Public | List destinations |
| `/api/enquiries` | GET | Admin | List, filter, search, page |
| `/api/enquiry/:id` | PATCH | Admin | Update status |
| `/api/destinations` | POST | Admin | Create |
| `/api/destinations/:id` | PATCH / DELETE | Admin | Update / delete |
| `/api/analytics/summary` | GET | Admin | Chart figures |
| `/api/admin/me` | GET | Admin | Session check |

### `POST /api/enquiry` — public

| Field | Type | Required | Rules |
| --- | --- | --- | --- |
| `fullName` | string | Yes | 2–80 characters |
| `countryCode` | string | Yes | Format `+91` |
| `contactNumber` | string | Yes | 6–15 digits |
| `email` | string | Yes | Valid email format |
| `dateOfTravel` | string | Yes | `YYYY-MM-DD`, must be in the future |
| `numberOfPeople` | number | Yes | Integer, 1–50 |
| `numberOfChildren` | number | No | Integer, 0–20 (defaults to 0) |
| `hotelCategory` | string | Yes | `Standard`, `Deluxe` or `Luxury` |
| `destination` | string | No | Must match a destination in the database |
| `tripDurationNights` | number | No | Integer, 1–90 |

```bash
curl -X POST https://travel-unbounded-omega.vercel.app/api/enquiry \
  -H "Content-Type: application/json" \
  -d '{
    "fullName": "Kurapati Saiteja",
    "countryCode": "+91",
    "contactNumber": "6305656651",
    "email": "kurapatisaitejas@gmail.com",
    "dateOfTravel": "2027-09-01",
    "numberOfPeople": 1,
    "numberOfChildren": 0,
    "hotelCategory": "Deluxe"
  }'
```

`201 Created`

```json
{
  "success": true,
  "message": "Thank you! Our travel expert will contact you within 24 hours.",
  "enquiryId": "6a8de4f0d321be19e415186f"
}
```

`400 Bad Request` — malformed JSON, or a field failed validation. Field-level messages are returned so the form can highlight them:

```json
{
  "success": false,
  "message": "Please correct the highlighted fields and try again.",
  "errors": { "email": "Enter a valid email address, e.g. name@example.com." }
}
```

`500 Internal Server Error` — the database was unreachable or the write failed. Database internals are logged on the server and never returned.

Only the normalised values produced by the validator are written, never the raw request body. A visitor therefore **cannot** set `status` by injecting it — every enquiry starts at `New`.

`GET /api/enquiry` is not implemented and returns 405; listing lives at `GET /api/enquiries`, behind auth.

### `POST /api/chat` — public

```json
{ "messages": [ { "role": "user", "content": "Ladakh for 5 days, two of us" } ] }
```

`200 OK` — `itinerary` is `null` while Sarathi is still asking questions, and an object once it has enough to plan. That single field is what decides bubble versus cards.

```json
{
  "success": true,
  "reply": "Here's a five-day Ladakh itinerary focused on photography.",
  "collected": {
    "destinationType": "Ladakh", "budget": "45,000 INR per person",
    "travelers": "2 adults", "duration": "5 days",
    "interests": "photography", "dates": "mid September"
  },
  "itinerary": {
    "title": "Five Days in Ladakh", "destination": "Ladakh",
    "summary": "...", "estimatedCost": "≈45,000 INR per person",
    "days": [ { "day": 1, "title": "Leh Arrival", "activity": "...", "highlight": "..." } ]
  }
}
```

`400` for a malformed conversation. `429` for a rate limit, with a retryable message. `502` for any other AI failure, carrying `"fallback": true` and a friendly message — never the provider's error text.

### `GET /api/enquiries` — admin

| Query | Default | Rules |
| --- | --- | --- |
| `status` | all | One of the four statuses; anything else means "all" |
| `search` | — | Matches name or email, max 80 characters |
| `page` | `1` | Positive integer |
| `limit` | `20` | Positive integer, capped at 100 |

Returns `enquiries`, `pagination` (`page`, `limit`, `total`, `pageCount`) and `counts` per status. Counts are computed over **all** enquiries, not the filtered set, so the filter tabs still show where everything is.

Search terms are escaped before going into a regular expression. Unescaped, `.` would match every row and `a{999999}` would be a denial of service against our own database.

### `PATCH /api/enquiry/:id` — admin

```bash
curl -X PATCH .../api/enquiry/<id> \
  -H "Authorization: Bearer <token>" -H "Content-Type: application/json" \
  -d '{"status":"Contacted"}'
```

`status` is the **only** field this route writes, named explicitly rather than spread from the body. `findByIdAndUpdate(id, body)` would let a status endpoint rewrite a customer's email, travel date or phone number; an admin session is not a licence to edit anything at all. `400` for a bad id or an unrecognised status, `404` if it no longer exists.

### `/api/destinations` — public GET, admin writes

`POST` and `PATCH` take `name`, `country`, `image`, `imageAlt`, `description`, `price`, `category`. `PATCH` is genuinely partial: incoming fields are merged over the stored document and the **merged result** is validated in full, so a partial update cannot leave the document invalid as a whole.

Image URLs must be `https` on an allowlisted host (`images.unsplash.com`), matching `next.config.mjs`. `next/image` throws on hosts it does not know, so without this check an admin could save a URL that crashes the page it appears on. `409` on a duplicate name — the name is uniquely indexed because enquiries reference a destination by name.

Deletes **do not cascade**. Enquiries store the destination as a plain string captured at the time, not a reference, so removing a destination takes it off the site and out of the dropdown while past enquiries keep the name they were made against.

### `GET /api/analytics/summary` — admin

`?days=` accepts 1–365, defaults to 30, and falls back to 30 for junk. Returns `totals`, `byStatus`, `timeline`, `byHotelCategory` and `topDestinations`.

Everything is aggregated inside MongoDB rather than by counting in the browser, which is what keeps the charts and the enquiries table from disagreeing. `npm run check:analytics-api` asserts that agreement directly: the status counts must sum to the total **and** match what `/api/enquiries` reports for each status filter.

The timeline includes days with zero enquiries. Omitting them would let a line chart join two distant points and imply a steady trickle where there was nothing.

## Deployment

Hosted on Vercel, deployed from `main`. Pushes to `main` deploy automatically.

To deploy your own copy:

1. Push the repository to GitHub.
2. In Vercel, **Add New → Project → Import Git Repository**.
3. Add **all eight** environment variables under Settings → Environment Variables before the first deploy. Paste `FIREBASE_PRIVATE_KEY` without surrounding quotes.
4. In MongoDB Atlas, allow access from `0.0.0.0/0` under Network Access.
5. In Firebase, add your Vercel domain under Authentication → Settings → Authorized domains, or sign-in will be rejected in production.
6. Deploy. Next.js is detected automatically; no build configuration is needed.

## Assumptions and Decisions

Where the brief left room for interpretation, these decisions were made and are documented here rather than hidden.

**Any authenticated Firebase user is an admin.** The Firebase project exists solely for this dashboard and contains one account, so there is no second class of user to distinguish. If the site ever had public Firebase accounts this would be wrong, and a custom-claim check belongs in `lib/requireAdmin.js` — the comment there says so.

**Destinations moved from a static file into MongoDB.** Phase 1 kept them in `data/destinations.js`, which CRUD cannot work against. That file is now the seed and the fallback. The knock-on was `validateEnquiry`, which built its destination whitelist by importing that file at module load — impossible once the list lives in the database, because the module is also imported by the browser-side form. The caller now supplies the list, so the validator stays synchronous and dependency-free.

**The home and contact pages render per request.** They read destinations from the database so dashboard edits appear without a deploy. If the database is unreachable they fall back to the seed file rather than erroring: on a read-only marketing page, slightly stale destinations beat an error.

**Sarathi's price estimates are the model's own guesses.** They are labelled "rough estimate only" in the UI and in the copied text. An early version quoted ₹10,000 for a five-day Maasai Mara safari against ₹185,000 in our own data. Grounding the figures in real destination prices is a small prompt change now that destinations are in the database, and is the obvious next improvement.

**The admin dashboard has its own layout.** The public navigation, footer and chat widget live in `app/(site)/layout.js`, not the root layout, so the dashboard does not inherit them — it previously did, which put a 600px marketing footer under the enquiries table.

**Navigation is a hamburger menu at every breakpoint.** A deliberate editorial choice to keep the header quiet against full-bleed photography. Every page is one click away and the panel is keyboard accessible.

**`react-icons` was added for brand logos.** lucide-react v1 removed all brand icons for trademark reasons, so the footer's social links use Font Awesome brand marks. lucide-react still provides every non-brand icon.

**Two optional fields were added to the enquiry form.** "Destination of Interest" and "Trip Length" go beyond the specified eight. Both are optional and validated on both sides, so a payload with only the required fields is still accepted.

**Sanity caps beyond the stated minimums.** Upper bounds of 50 travellers, 20 children and 90 nights are enforced so an absurd payload cannot be stored. Product judgements, not requirements.

**The future-date check uses the server's local date.** On Vercel that is UTC, so a traveller in IST submitting between 00:00 and 05:30 is compared against the previous UTC day. A production system would carry the user's timezone in the payload.

**Chart colours are computed, not chosen by eye.** The status palette was validated against the dashboard's dark surface for lightness, chroma, colour-blind separation and contrast. The brand's own greens failed the chroma floor at those lightness steps — they read as grey — so the status hues step outside the site palette. Slot order matters too: placing the green next to the terracotta dropped the worst adjacent pair below the colour-blindness target, so the violet sits between them.

**Other notes**

- Destination content, pricing and the "12+ years / 40+ destinations" statistics are dummy data, as the assignment permits.
- Photography is hotlinked from Unsplash and the host is allowlisted in `next.config.mjs`. No images were taken from the real Travel Unbounded website, and the logo is original inline SVG.
- A single light theme is shipped for the public site; the admin dashboard is dark. The scaffold's dark mode was removed rather than left half-finished.
- Company copy on the About page is used as supplied in the assignment brief.
- The itinerary bonus is partly done: copy to clipboard is implemented; saving itineraries to the database with a timestamp is not.
