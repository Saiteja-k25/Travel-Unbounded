/** @type {import('next').NextConfig} */
const nextConfig = {
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
