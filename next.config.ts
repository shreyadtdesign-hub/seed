import type { NextConfig } from "next";

// GitHub Pages serves this repo at https://<user>.github.io/seed/, so ONLY
// that specific deploy needs every asset path prefixed with /seed — not
// "production" builds in general. Netlify, Vercel, and any other host
// serve this site from their own domain root, where a hardcoded /seed
// prefix would 404 every asset (blank white page, HTML loads but nothing
// else does). GITHUB_PAGES is set explicitly by .github/workflows/
// deploy-pages.yml, so it's opt-in only for that one deploy target.
const basePath = process.env.GITHUB_PAGES === "true" ? "/seed" : "";

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
