import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "RakkhaNet — AI Disaster Response Platform for Bangladesh",
  description: "AI-powered emergency shelter locator, flood & cyclone risk map, and relief coordination system.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-[#0d1117] text-white antialiased">
        {children}
      </body>
    </html>
  );
}
