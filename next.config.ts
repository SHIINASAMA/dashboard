import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  serverExternalPackages: ["argon2"],
  typescript: {
    ignoreBuildErrors: process.env.SKIP_NEXT_TYPECHECK === "1",
    tsconfigPath: process.env.NODE_ENV === "production" ? "tsconfig.build.json" : "tsconfig.json",
  },
  experimental: {
    cpus: 1,
    staticGenerationMaxConcurrency: 1,
    staticGenerationMinPagesPerWorker: 29,
    webpackBuildWorker: false,
    webpackMemoryOptimizations: true,
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
      {
        source: "/api/:path*",
        headers: [
          { key: "Access-Control-Allow-Origin", value: process.env.ALLOWED_ORIGINS || "*" },
        ],
      },
    ];
  },
};

export default nextConfig;
