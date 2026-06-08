import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  experimental: {
    serverActions: {
      // Photo + medical document uploads can hit several MB.
      // Default is 1 MB which silently fails image uploads.
      bodySizeLimit: "12mb",
    },
  },
};

export default nextConfig;
