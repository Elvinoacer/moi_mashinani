import "./requests.css";
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
    <div className="interior-page requests-page">
      <Navbar />
      <main className="requests-page mx-auto w-full max-w-6xl px-4 pb-28 pt-6 sm:px-6 sm:pt-10">
        <RequestBoard />
      </main>
      <Footer />
      <BottomNav />
    </div>
  );
}
