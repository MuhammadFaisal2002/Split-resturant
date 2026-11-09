import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Every page in this app is per-user or live (payment board), so we use the
  // classic dynamic rendering model instead of Cache Components.
  cacheComponents: false,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  images: {
    remotePatterns: [{ protocol: "https", hostname: "**.supabase.co" }],
  },
};

export default nextConfig;
