import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    proxyClientMaxBodySize: "20mb", // Increase from default 10MB[reference:2]
  },
};

export default nextConfig;