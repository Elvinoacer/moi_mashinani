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
  title: { absolute: "Moi Mashinani | Businesses Around Moi University, Kesses" },
  description:
    "Find businesses around Moi University with Moi Mashinani. Explore shops, hostels, food, printing, repairs and student services in Kesses. Compare listings and contact sellers directly.",
  keywords: [
    "Moi Mashinani", "MoiMashinani", "moimashinani", "moishanani",
    "Moi University businesses", "businesses around Moi University",
    "shops near Moi University", "services near Moi University",
    "Moi University business directory", "Kesses businesses",
  ],
  alternates: { canonical: "/" },
  openGraph: {
    title: "Moi Mashinani | Businesses Around Moi University",
    description:
      "Discover businesses near Moi University Main Campus in Kesses: shops, hostels, food, repairs, printing and student services.",
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
