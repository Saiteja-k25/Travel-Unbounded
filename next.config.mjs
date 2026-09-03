/** @type {import('next').NextConfig} */
const nextConfig = {
  // Hides the floating Next.js dev tools badge. It is only ever injected by
  // `next dev` and never ships in a production build, but it sits on top of
  // the footer while developing.
  devIndicators: false,

  // firebase-admin must not be bundled. It is a Node-only package that resolves
  // parts of itself with dynamic requires, which the bundler cannot trace, so
  // the bundled copy throws while the route module is still being imported.
  //
  // That failure mode is nasty: it happens before any handler runs, so every
  // route importing lib/requireAdmin.js returned an empty 500 instead of the
  // 401 it was written to return - and only on the deployed build, never
  // locally. Left as an external package, Node requires it at runtime as it
  // expects.
  serverExternalPackages: ["firebase-admin"],

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
