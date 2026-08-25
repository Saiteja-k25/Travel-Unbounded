import { Fraunces, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

/*
  next/font downloads these at build time and self-hosts them from our own
  domain, so there are no requests to Google at runtime and no layout shift.
  Each font exposes a CSS variable that globals.css reads inside @theme.
*/
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
