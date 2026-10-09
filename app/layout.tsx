import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

const manrope = localFont({
  src: "../public/fonts/manrope-latin-variable.woff2",
  variable: "--font-manrope",
  weight: "200 800",
  style: "normal",
  display: "swap",
  fallback: ["Arial", "sans-serif"],
});

export const metadata: Metadata = {
  title: "MoiMashinani | Kesses Campus Business Directory — Moi University",
  description:
    "Find food, refreshments, groceries, housing, clothing, health, transport, study essentials and local services around Moi University Main Campus (Kesses). Call or WhatsApp businesses directly.",
  icons: {
    icon: [
      { url: "/brand/moimashinani-mark.svg", type: "image/svg+xml", sizes: "any" },
    ],
    shortcut: "/favicon.ico",
    apple: { url: "/brand/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full">
      <body className={`${manrope.variable} min-h-full flex flex-col bg-[#f7f8f2] text-[#243b32] antialiased`}>
        {children}
      </body>
    </html>
  );
}
