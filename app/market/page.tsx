import { connection } from "next/server";
import { Store } from "@/lib/store";
import { publicBusiness } from "@/lib/business-input";
import { survivalMatch } from "@/lib/campus-value";
import { ComradeMarket } from "@/components/ComradeMarket";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { BottomNav } from "@/components/BottomNav";
export const metadata = {
  title: "Comrade Market — Student Hustles & Declutter",
  description:
    "Verified Moi student sellers, hostel services and second-hand campus essentials. Post a student hustle or declutter item for free.",
};
export default async function MarketPage() {
  await connection();
  const now = new Date().getTime();
  const listings = (await Store.getBusinesses())
    .filter((b) => survivalMatch(b, "comrade", now))
    .map(publicBusiness);
  return (
    <div className="interior-page">
      <Navbar />
      <main className="mx-auto max-w-6xl space-y-6 px-4 py-8 pb-24">
        <ComradeMarket initial={listings} />
      </main>
      <Footer />
      <BottomNav />
    </div>
  );
}
