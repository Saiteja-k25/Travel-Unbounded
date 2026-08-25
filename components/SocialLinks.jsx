import {
  FaInstagram,
  FaLinkedinIn,
  FaWhatsapp,
  FaXTwitter,
  FaYoutube,
} from "react-icons/fa6";

// lucide-react v1 dropped its brand icons, so the real logos come from
// react-icons (Font Awesome 6 brands). lucide is still used for every
// non-brand icon on the site.

// The message is pre-filled for the visitor; encodeURIComponent keeps the
// spaces valid inside the URL.
const whatsappMessage = encodeURIComponent(
  "Hi, interested in knowing about a Travel Unbounded journey."
);

const socials = [
  {
    name: "Instagram",
    href: "https://www.instagram.com/travel_ub/",
    Icon: FaInstagram,
  },
  {
    name: "YouTube",
    href: "https://www.youtube.com/@travelunbounded668/",
    Icon: FaYoutube,
  },
  {
    name: "LinkedIn",
    href: "https://www.linkedin.com/company/travel-unbounded/",
    Icon: FaLinkedinIn,
  },
  {
    name: "WhatsApp",
    href: `https://wa.me/919141001434?text=${whatsappMessage}`,
    Icon: FaWhatsapp,
  },
  {
    name: "X",
    href: "https://x.com/travelub1",
    Icon: FaXTwitter,
  },
];

export default function SocialLinks() {
  return (
    <div>
      <h2 className="text-[0.65rem] font-semibold uppercase tracking-[0.22em] text-clay-300">
        Follow us
      </h2>

      <ul className="mt-4 flex flex-wrap gap-3">
        {socials.map(({ name, href, Icon }) => (
          <li key={name}>
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Travel Unbounded on ${name}`}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-forest-700 text-forest-200 transition hover:border-clay-400 hover:bg-forest-800 hover:text-clay-300"
            >
              <Icon className="h-[18px] w-[18px]" aria-hidden="true" />
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
