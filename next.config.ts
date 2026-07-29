import type { NextConfig } from "next";

// Vercel uses Next.js's default output (serverless/edge functions per route),
// so we do NOT set `output: "standalone"` here — that's only for self-hosted
// Docker/Node deployments. The build script's post-build copy step is guarded
// by a directory check so `npm run build` still succeeds everywhere.
const nextConfig: NextConfig = {
  reactStrictMode: true,
};

export default nextConfig;
