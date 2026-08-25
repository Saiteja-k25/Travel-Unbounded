# Travel Unbounded

A production-style travel company website built for the Travel Unbounded Full Stack Developer assignment (Phase 1).

- **Live demo:** https://travel-unbounded-omega.vercel.app
- **Repository:** https://github.com/Saiteja-k25/Travel-Unbounded

## Overview

The site showcases curated travel destinations across India and the wider world, tells the company story, and captures booking enquiries through a form that is validated on both the client and the server before being persisted to MongoDB.

The core flow the assignment asks for is:

```
Booking form → client-side validation → POST /api/enquiry
             → server-side validation → MongoDB → JSON response → confirmation UI
```

Server-side validation is deliberately independent of the browser: the API can be called directly with `curl` or Postman and it still rejects bad input, because client-side validation proves nothing about what actually reaches the database.

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
| Icons | lucide-react | 1.34.0 |
| Brand icons | react-icons | 5.7.0 |
| Hosting | Vercel | — |

Next.js serves both the pages and the API, so there is no separate backend service, no CORS configuration and a single deployment.

## Features

**Pages**

- **Home** — hero, a travel-notes band, India destinations, international destinations, a word marquee and a closing call to action.
- **About** — company story, the three office locations, and a "why choose us" section.
- **Contact** — the booking enquiry form plus supporting contact details.

**Frontend**

- Fully responsive; verified at 375px, 768px, 1024px and 1440px with no horizontal overflow on any page.
- Reusable component structure — one `DestinationCard` renders all ten destinations, and one `DestinationSection` renders both the India and international blocks.
- Draggable, snapping destination carousel with arrow controls and a subtle 3D tilt.
- Slide-over navigation panel that locks page scroll, moves focus into itself, returns focus on close, and closes on Escape or backdrop click.
- Header hides on scroll down and returns on scroll up, or on hover at the top of the screen.
- Per-page SEO titles and meta descriptions.
- Custom SVG logo and favicon; no third-party logo files.

**Form and API**

- All required fields: full name, country code, contact number, email, date of travel, number of people, hotel category and number of children.
- Client-side validation runs before any network request is made.
- Identical rules re-run on the server, which is the only validation that actually guards the database.
- Loading state disables the submit button and shows a spinner, preventing duplicate submissions.
- Distinct success and error UI states — no `alert()` anywhere in the codebase.
- Meaningful HTTP status codes: 201, 400 and 500.

## Project Structure

```
app/
  layout.js              Root layout: fonts, metadata, navbar and footer
  page.js                Home page
  about/page.js          About page
  contact/page.js        Contact page with the enquiry form
  api/enquiry/route.js   POST /api/enquiry
  globals.css            Tailwind import and the design tokens (@theme)
  favicon.ico, icon.svg  Brand favicon

components/              17 presentational and interactive components
  DestinationCard.jsx    A single destination card (reused for all ten)
  DestinationSection.jsx A titled block of cards (reused for both sections)
  EnquiryForm.jsx        Form state, validation, loading/success/error UI
  Navbar.jsx             Header and slide-over menu panel
  ...

data/
  destinations.js        The ten destinations as static data (no database)
  offices.js             The three office locations

lib/
  mongodb.js             Cached Mongoose connection helper
  validateEnquiry.js     Validation rules shared by the client and the server

models/
  Enquiry.js             Mongoose schema for a booking enquiry
```

Destination and pricing data is static, as the assignment allows. There is no database collection behind it — the only Mongoose model in the project is `Enquiry`.

## Local Setup

Requires Node.js 18.18 or newer.

```bash
git clone https://github.com/Saiteja-k25/Travel-Unbounded.git
cd Travel-Unbounded
npm install
```

Create a `.env.local` file in the project root (see the next section), then:

```bash
npm run dev
```

Open http://localhost:3000.

Other scripts:

```bash
npm run build   # production build
npm run start   # serve the production build
npm run lint    # ESLint
```

## Environment Variables

Copy `.env.example` to `.env.local` and fill in the value:

| Variable | Required | Description |
| --- | --- | --- |
| `MONGODB_URI` | Yes | MongoDB Atlas connection string, including the database name |

```
MONGODB_URI=mongodb+srv://<user>:<password>@<cluster>.mongodb.net/travelunbounded
```

Notes:

- `.env.local` is gitignored and has never been committed. `.env.example` is committed with a placeholder.
- If the password contains `@`, `#`, `/` or `:` it must be URL-encoded.
- Include the database name in the path, otherwise Mongoose connects to `test`.
- On Vercel, add `MONGODB_URI` under **Settings → Environment Variables**, and allow access from anywhere (`0.0.0.0/0`) in the Atlas Network Access list, since Vercel's outbound IPs are not fixed.

## API

### `POST /api/enquiry`

Creates a booking enquiry.

**Request body**

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
| `destination` | string | No | Must match one of the listed destinations |
| `tripDurationNights` | number | No | Integer, 1–90 |

**Example**

```bash
curl -X POST https://travel-unbounded-omega.vercel.app/api/enquiry \
  -H "Content-Type: application/json" \
  -d '{
    "fullName": "Kurapati Saiteja",
    "countryCode": "+91",
    "contactNumber": "6305656651",
    "email": "kurapatisaitejas@gmail.com",
    "dateOfTravel": "2026-09-01",
    "numberOfPeople": 1,
    "numberOfChildren": 0,
    "hotelCategory": "Deluxe"
  }'
```

**Responses**

`201 Created`

```json
{
  "success": true,
  "message": "Thank you! Our travel expert will contact you within 24 hours.",
  "enquiryId": "6a8de4f0d321be19e415186f"
}
```

`400 Bad Request` — malformed JSON, or one or more fields failed validation. Field-level messages are returned so the form can highlight them:

```json
{
  "success": false,
  "message": "Please correct the highlighted fields and try again.",
  "errors": { "email": "Enter a valid email address, e.g. name@example.com." }
}
```

`500 Internal Server Error` — the database was unreachable or the write failed. Database internals are logged on the server and never returned to the client.

Only the normalised values produced by the validator are written to the database, never the raw request body, so unexpected or injected fields are ignored.

`GET /api/enquiry` is not implemented and returns 405. It was listed as an optional bonus.

## Deployment

Hosted on Vercel, deployed from the `main` branch of this repository. Pushes to `main` deploy automatically.

To deploy your own copy:

1. Push the repository to GitHub.
2. In Vercel, choose **Add New → Project → Import Git Repository** and select the repo.
3. Add `MONGODB_URI` under Environment Variables before the first deploy.
4. Deploy. Next.js is detected automatically; no build configuration is needed.

## Assumptions and Decisions

Where the brief left room for interpretation, these decisions were made and are documented here rather than hidden.

**Navigation is a hamburger menu at every breakpoint.** Rather than a horizontal link bar on desktop, the header carries a single "Menu" button that opens a panel across half the screen. This was a deliberate editorial choice to keep the header quiet against full-bleed photography. Every page remains one click away, and the panel is keyboard accessible.

**`react-icons` was added for brand logos.** lucide-react v1 removed all brand icons (Instagram, YouTube, LinkedIn and so on) for trademark reasons, so the footer's social links use Font Awesome brand marks from `react-icons`. lucide-react still provides every non-brand icon in the project.

**Two optional fields were added to the form.** "Destination of Interest" and "Trip Length" go beyond the specified eight fields. Both are optional and validated on both client and server, so a payload containing only the required fields is still accepted.

**The future-date check uses the server's local date.** On Vercel that is UTC. A traveller in IST submitting between 00:00 and 05:30 local time is therefore compared against the previous UTC day. The impact is limited to that edge window; a production system would carry the user's timezone in the payload.

**Sanity caps were added beyond the stated minimums.** The brief requires people ≥ 1 and children ≥ 0. Upper bounds of 50 travellers, 20 children and 90 nights are also enforced so that an absurd payload cannot be stored. These are product judgements, not requirements.

**Other notes**

- Destination content, pricing and the "12+ years / 40+ destinations" statistics are dummy data, as the assignment permits.
- Photography is hotlinked from Unsplash and the host is allowlisted in `next.config.mjs` for `next/image`. No images were taken from the real Travel Unbounded website, and the logo is original inline SVG.
- A single light theme is shipped; the scaffold's dark mode was removed rather than left half-finished.
- Company copy on the About page is used as supplied in the assignment brief.
