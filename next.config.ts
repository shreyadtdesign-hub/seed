import type { NextConfig } from "next";

// GitHub Pages serves this repo at https://<user>.github.io/seed/, so
// production builds need every asset path prefixed with /seed.
const basePath = process.env.NODE_ENV === "production" ? "/seed" : "";

const nextConfig: NextConfig = {
  output: "export",
  basePath,
  assetPrefix: basePath ? `${basePath}/` : undefined,
  images: {
    unoptimized: true,
  },
  env: {
    NEXT_PUBLIC_BASE_PATH: basePath,
  },
};

export default nextConfig;
