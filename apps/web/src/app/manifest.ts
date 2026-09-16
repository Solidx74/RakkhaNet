import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "RakkhaNet",
    short_name: "RakkhaNet",
    description:
      "AI-powered disaster response and relief coordination for Bangladesh",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#1B3A6B",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
