import { Suspense } from "react";
import { connection } from "next/server";
import { Store } from "@/lib/store";
import { publicBusiness } from "@/lib/business-input";
import { publicListing, survivalMatch } from "@/lib/campus-value";
import { ComradeMarket } from "@/components/ComradeMarket";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { BottomNav } from "@/components/BottomNav";
export const metadata = {
  title: "Comrade Market — Student Hustles & Declutter",
  description:
    "Find student sellers, second-hand goods and campus services in Moi Mashinani's Comrade Market around Moi University in Kesses.",
  alternates: { canonical: "/market" },
  openGraph: {
    title: "Comrade Market | Moi Mashinani",
    description: "Browse campus hustles, student sellers, second-hand goods and local services around Moi University.",
    url: "/market",
    siteName: "Moi Mashinani",
    type: "website" as const,
  },
};
export default async function MarketPage() {
  await connection();
  const now = new Date().getTime();
  const listings = (await Store.getBusinesses())
    .filter((b) =>
      survivalMatch(b, "comrade", now) ||
      (publicListing(b, now) &&
        b.sellerType === "COMRADE" &&
        b.services.some((s) => s.inStock !== false))
    )
    .map(publicBusiness);
  return (
    <div className="interior-page">
      <Navbar />
      <main className="mx-auto max-w-6xl space-y-6 px-4 py-8 pb-24">
        <Suspense fallback={<p role="status">Loading market…</p>}>
          <ComradeMarket initial={listings} />
        </Suspense>
      </main>
      <Footer />
      <BottomNav />
    </div>
  );
}
