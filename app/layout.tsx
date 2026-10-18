import { NotificationCenter } from '@/components/NotificationCenter';
import { BusinessImpressions } from '@/components/BusinessImpressions';
import { PublicMotion } from '@/components/PublicMotion';
import { Suspense } from 'react';
import type { Metadata } from "next";
import localFont from "next/font/local";
import { SITE_URL, SITE_NAME, CORE_CAMPUS_KEYWORDS } from "@/lib/seo";
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
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Moi Mashinani | Local Businesses & Services Near Moi University",
    template: "%s | Moi Mashinani",
  },
  description:
    "Discover businesses and services around Moi University Main Campus in Kesses on Moi Mashinani. Find shops, food, hostels, repairs, printing and more.",
  keywords: CORE_CAMPUS_KEYWORDS,
  authors: [{ name: SITE_NAME, url: SITE_URL }],
  creator: SITE_NAME,
  publisher: SITE_NAME,
  applicationName: SITE_NAME,
  category: "business",
  classification: "Campus Business Directory",
  openGraph: {
    title: "Moi Mashinani | Moi University Campus Business Directory",
    description:
      "Find businesses, food, hostels, student rooms, phone repairs, salons and local services around Moi University Main Campus in Kesses.",
    url: SITE_URL,
    siteName: SITE_NAME,
    locale: "en_KE",
    type: "website",
    images: [
      {
        url: "/brand/og-image.png",
        width: 1200,
        height: 630,
        alt: "Moi Mashinani — campus businesses and student services around Moi University",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Moi Mashinani | Local Businesses Near Moi University",
    description:
      "Find food, hostels, phone repairs, printing and campus services in Kesses.",
    images: ["/brand/og-image.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
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
        <BusinessImpressions />
        <Suspense fallback={null}><PublicMotion /></Suspense>
        <Suspense fallback={null}><NotificationCenter /></Suspense>
      </body>
    </html>
  );
}
