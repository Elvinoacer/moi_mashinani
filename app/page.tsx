import { survivalMatch } from "@/lib/campus-value";
import { randomUUID } from "node:crypto";
import type { Metadata } from "next";
import Link from "@/components/MotionLink";
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
      <main className="mx-auto max-w-6xl space-y-4 px-3 pb-28 sm:space-y-7 sm:px-6 md:pb-16">
        <CampusHome businesses={businesses} initialNow={now} discoverySession={randomUUID()} />
        <section data-motion="reveal" aria-labelledby="moi-university-businesses" className="rounded-[20px] border border-[#dce6d8] bg-white px-4 py-5 sm:px-7 sm:py-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 id="moi-university-businesses" className="font-display text-lg font-extrabold text-[#183e35] sm:text-2xl">More around Moi University</h2>
              <p className="mt-1 text-sm leading-6 text-[#617366]">Discover Kesses food, shops, hostels, repairs and student services.</p>
            </div>
            <Link href="/categories" className="inline-flex min-h-11 items-center text-sm font-bold text-[#29553d] underline underline-offset-4">All categories →</Link>
          </div>
          <nav aria-label="Popular Moi University business categories" className="mt-3 flex flex-wrap gap-x-4 gap-y-1">
            <Link className="inline-flex min-h-10 items-center text-sm font-semibold text-[#315a3d] underline underline-offset-4" href="/c/food-cafes">Food & cafes</Link>
            <Link className="inline-flex min-h-10 items-center text-sm font-semibold text-[#315a3d] underline underline-offset-4" href="/c/shops-supermarkets">Shops</Link>
            <Link className="inline-flex min-h-10 items-center text-sm font-semibold text-[#315a3d] underline underline-offset-4" href="/c/hostels-rooms">Hostels</Link>
            <Link className="inline-flex min-h-10 items-center text-sm font-semibold text-[#315a3d] underline underline-offset-4" href="/c/printing-cyber">Printing</Link>
          </nav>
        </section>
      </main>
      <Footer />
      <BottomNav />
    </div>
  );
}
