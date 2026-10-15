import { survivalMatch } from "@/lib/campus-value";
import type { Metadata } from "next";
import { connection } from "next/server";
import { Store } from "@/lib/store";
import { publicBusiness } from "@/lib/business-input";
import { CampusHome } from "@/components/CampusHome";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { BottomNav } from "@/components/BottomNav";
import { generateWebsiteSchema, generateOrganizationSchema, safeJsonLd, SITE_NAME } from "@/lib/seo";
export const metadata: Metadata = {
  title: { absolute: "Moi Mashinani | Find Businesses & Services Near Moi University" },
  description:
    "Discover Moi Mashinani, the campus business directory for Moi University in Kesses. Find food, hostels, bedsitters, phone repairs, printing, salons and student services nearby. Compare prices and contact sellers directly.",
  keywords: ["Moi Mashinani", "MoiMashinani", "moimashinani", "moishanani"],
  alternates: { canonical: "/" },
  openGraph: {
    title: "Moi Mashinani | Campus Businesses & Services in Kesses",
    description:
      "Find local shops, food, hostels, repairs, printing and student services around Moi University on Moi Mashinani.",
    url: "/",
    siteName: SITE_NAME,
    type: "website",
    images: [{ url: "/brand/og-image.png", width: 1200, height: 630, alt: "Moi Mashinani — campus business discovery" }],
  },
};

export default async function HomePage() {
  await connection();
  const now = new Date().getTime();
  const businesses = (await Store.getBusinesses())
    .filter((b) => survivalMatch(b, "all", now))
    .map(publicBusiness);
  return (
    <div className="interior-page">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(generateWebsiteSchema()) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(generateOrganizationSchema()) }} />
      <a className="sr-only focus:not-sr-only" href="#landing-query">
        Skip to search
      </a>
      <Navbar />
      <main className="mx-auto max-w-6xl space-y-7 px-3 pb-36 sm:px-6 md:pb-16">
        <CampusHome businesses={businesses} />
      </main>
      <Footer />
      <BottomNav />
    </div>
  );
}
