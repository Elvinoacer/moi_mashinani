import type { Metadata } from "next";
import localFont from "next/font/local";
import {
  SITE_URL,
  CORE_CAMPUS_KEYWORDS,
  generateWebsiteSchema,
  generateOrganizationSchema,
  safeJsonLd,
} from "@/lib/seo";
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
    default: "MoiMashinani — Moi University Campus Business Directory | Kesses",
    template: "%s | MoiMashinani",
  },
  description:
    "Find food, kibandas, hostels, student bedsitters, kinyozi salons, phone repairs, groceries, printing and local fundis around Moi University Main Campus (Kesses). Call or WhatsApp businesses directly.",
  keywords: CORE_CAMPUS_KEYWORDS,
  authors: [{ name: "MoiMashinani", url: SITE_URL }],
  creator: "MoiMashinani",
  publisher: "MoiMashinani",
  applicationName: "MoiMashinani",
  category: "business",
  classification: "Campus Business Directory",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "MoiMashinani — Moi University Campus Business Directory",
    description:
      "Find food, kibandas, hostels, student rooms, phone repairs, kinyozi salons and campus fundis in Kesses. Call or WhatsApp businesses directly.",
    url: "/",
    siteName: "MoiMashinani",
    locale: "en_KE",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "MoiMashinani — Moi University Campus Business Directory",
    description:
      "Find food, hostels, phone repairs, kinyozi salons and campus fundis in Kesses with direct contact.",
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
  const websiteSchema = generateWebsiteSchema();
  const orgSchema = generateOrganizationSchema();

  return (
    <html lang="en" className="h-full">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: safeJsonLd(websiteSchema) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: safeJsonLd(orgSchema) }}
        />
      </head>
      <body className={`${manrope.variable} min-h-full flex flex-col bg-[#f7f8f2] text-[#243b32] antialiased`}>
        {children}
      </body>
    </html>
  );
}
