import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MoiMashinani | Kesses Campus Business Directory — Moi University",
  description:
    "Find trusted phone repair, printing, braids, laundry, cooking gas, hostels, and student services in seconds around Moi University Main Campus (Kesses). Two taps to Call or WhatsApp.",
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full flex flex-col bg-[#F2F5F8] text-[#001C3B] antialiased">
        {children}
      </body>
    </html>
  );
}
