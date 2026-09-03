import { Fraunces, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  display: "swap",
});

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
  display: "swap",
});

export const metadata = {
  title: "Travel Unbounded | Experiential Travel Experts",
  description:
    "Travel Unbounded designs personally-vetted journeys across India and the world, blending comfort, culture and raw nature.",
};

// The root layout holds only what EVERY route needs: the document shell, the
// fonts and the global stylesheet.
//
// The navigation, footer and chat widget are not here. They belong to the
// public site and live in app/(site)/layout.js, because the admin dashboard
// should not be wrapped in the marketing chrome - it was, and a 600px footer
// selling holidays sat underneath the enquiries table.
export default function RootLayout({ children }) {
  return (
    <html
      lang="en"
      className={`${fraunces.variable} ${jakarta.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
