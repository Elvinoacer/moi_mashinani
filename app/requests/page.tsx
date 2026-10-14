import type { Metadata } from "next";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { BottomNav } from "@/components/BottomNav";
import { RequestBoard } from "@/components/RequestBoard";
export const metadata: Metadata = {
  title: "Comrade Requests | Moi University",
  description:
    "Ask for products, services or rooms around campus. No login required to post.",
  alternates: { canonical: "/requests" },
};
export default function RequestsPage() {
  return (
    <div className="interior-page">
      <Navbar />
      <main className="mx-auto max-w-5xl space-y-6 px-4 py-8 pb-24">
        <h1 className="text-3xl font-bold">Soko: ask the campus</h1>
        <RequestBoard />
      </main>
      <Footer />
      <BottomNav />
    </div>
  );
}
