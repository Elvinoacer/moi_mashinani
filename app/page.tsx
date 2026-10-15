import { survivalMatch } from "@/lib/campus-value";
import type { Metadata } from "next";
import Link from "next/link";
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
        <section aria-labelledby="moi-university-businesses" className="rounded-[24px] border border-[#dce6d8] bg-white px-5 py-7 shadow-[0_5px_22px_#183e3508] sm:px-8 sm:py-9">
          <p className="text-xs font-bold uppercase tracking-[0.13em] text-[#527357]">Discover Kesses</p>
          <h2 id="moi-university-businesses" className="mt-2 font-display text-2xl font-extrabold text-[#183e35] sm:text-3xl">
            Explore businesses around Moi University
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-[#617366] sm:text-base">
            Looking for shops near Moi University Main Campus? Moi Mashinani brings
            local business listings from Kesses and nearby campus areas together.
            Browse published products, services and contact details, then speak
            directly with the seller before making arrangements.
          </p>
          <div className="mt-6 grid gap-3 md:grid-cols-3">
            <div className="rounded-2xl bg-[#f4f7ef] p-4">
              <h3 className="font-bold text-[#234734]">Food and daily essentials</h3>
              <p className="mt-2 text-sm leading-6 text-[#627366]">
                Find campus eateries, groceries and everyday shops near Moi University.
              </p>
              <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2">
                <Link className="text-sm font-bold text-[#315a3d] underline underline-offset-4" href="/c/food-cafes">Food & cafes</Link>
                <Link className="text-sm font-bold text-[#315a3d] underline underline-offset-4" href="/c/shops-supermarkets">Shops</Link>
              </div>
            </div>
            <div className="rounded-2xl bg-[#f4f7ef] p-4">
              <h3 className="font-bold text-[#234734]">Student housing</h3>
              <p className="mt-2 text-sm leading-6 text-[#627366]">
                Browse hostels, bedsitters and room listings around Kesses and campus.
              </p>
              <Link className="mt-3 inline-block text-sm font-bold text-[#315a3d] underline underline-offset-4" href="/c/hostels-rooms">Hostels & rooms</Link>
            </div>
            <div className="rounded-2xl bg-[#f4f7ef] p-4">
              <h3 className="font-bold text-[#234734]">Repairs and services</h3>
              <p className="mt-2 text-sm leading-6 text-[#627366]">
                Discover phone and laptop repair, printing, cyber services and local fundis.
              </p>
              <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2">
                <Link className="text-sm font-bold text-[#315a3d] underline underline-offset-4" href="/c/phone-laptop-repair">Tech repairs</Link>
                <Link className="text-sm font-bold text-[#315a3d] underline underline-offset-4" href="/c/printing-cyber">Printing</Link>
              </div>
            </div>
          </div>
          <Link href="/categories" className="mt-5 inline-flex min-h-11 items-center text-sm font-bold text-[#29553d] underline underline-offset-4">
            Browse all Moi University business categories →
          </Link>
        </section>
      </main>
      <Footer />
      <BottomNav />
    </div>
  );
}
