import type { Metadata, Viewport } from "next";
import "./globals.css";
import ReactQueryProvider from "@/components/providers/ReactQueryProvider";
import OfflineBanner from "@/components/OfflineBanner";

export const metadata: Metadata = {
  title: "RakkhaNet — AI Disaster Response Platform for Bangladesh",
  description: "AI-powered emergency shelter locator, flood & cyclone risk map, and evacuation guidance.",
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  themeColor: "#0F172A",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link
          rel="stylesheet"
          href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
          integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY="
          crossOrigin=""
        />
      </head>
      <body className="min-h-screen bg-[#0F172A] text-white antialiased">
        <ReactQueryProvider>
          <OfflineBanner />
          {children}
        </ReactQueryProvider>
      </body>
    </html>
  );
}
