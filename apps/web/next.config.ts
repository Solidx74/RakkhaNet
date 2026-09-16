import type { NextConfig } from "next";
import path from "path";
import withPWAInit from "@ducanh2912/next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  cacheOnFrontEndNav: true,
  reloadOnOnline: true,
  disable: process.env.NODE_ENV === "development", // easier to debug without SW caching in dev
});

const nextConfig: NextConfig = {
  reactCompiler: true,
  turbopack: {
    // levels up from apps/web to C:\rakkhanet
    root: path.resolve(__dirname, "../../"),
  },
};

export default withPWA(nextConfig);
