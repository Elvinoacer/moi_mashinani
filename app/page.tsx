import { survivalMatch } from "@/lib/campus-value";
import type { Metadata } from "next";
import { connection } from "next/server";
import { Store } from "@/lib/store";
import { publicBusiness } from "@/lib/business-input";
import { CampusHome } from "@/components/CampusHome";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { BottomNav } from "@/components/BottomNav";
export const metadata: Metadata = {
  title: "MoiMashinani — Campus Prices, Deals & Verified Sellers | Kesses",
  description:
    "Compare product and service prices, find live campus sellers and post comrade requests around Moi University. Contact sellers directly on WhatsApp.",
  alternates: { canonical: "/" },
};
export default async function HomePage() {
  await connection();
  const now = new Date().getTime();
  const businesses = (await Store.getBusinesses())
    .filter((b) => survivalMatch(b, "all", now))
    .map(publicBusiness);
  return (
    <div className="interior-page">
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
