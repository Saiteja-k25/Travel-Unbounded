/** @type {import('next').NextConfig} */
const nextConfig = {
  // Hides the floating Next.js dev tools badge. It is only ever injected by
  // `next dev` and never ships in a production build, but it sits on top of
  // the footer while developing.
  devIndicators: false,

  images: {
    // next/image only optimises images from hosts listed here. Without this
    // allowlist Next throws on external URLs, which stops anyone from using
    // our deployment as a free image-resizing proxy for arbitrary sites.
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
    ],
  },
};

export default nextConfig;
