import type { Metadata } from "next";
import { ToastContainer } from "react-toastify";
import { Navbar } from "@/components/layout/navbar";
import "./globals.css";
import "react-toastify/dist/ReactToastify.css";
import { Footer } from "@/components/layout/footer";

export const metadata: Metadata = {
  title: "RakkhaNet",
  description:
    "AI-powered disaster response and relief coordination for Bangladesh",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="flex min-h-screen flex-col">
        <Navbar />
        <main className="flex-1">{children}</main>
        <Footer />
        <ToastContainer position="top-right" autoClose={4000} theme="colored" />
      </body>
    </html>
  );
}
