import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Required for Cloudflare Workers
  trailingSlash: true,
  skipTrailingSlashRedirect: true,
  // Output configuration for Cloudflare Workers
  output: 'standalone',
};

export default nextConfig;
