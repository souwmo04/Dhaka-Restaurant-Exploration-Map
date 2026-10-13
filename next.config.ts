import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  // Hide the floating "N" dev-tools button (it covers the restaurant list in development).
  // Build/runtime errors are still shown.
  devIndicators: false,
  partialPrefetching: true,
  // Basic hardening on every response, whatever the host.
  headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
