import "../requests/requests.css";
import "./housing.css";
import type { Metadata } from "next";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { BottomNav } from "@/components/BottomNav";
import { RequestBoard } from "@/components/RequestBoard";

export const metadata: Metadata = {
  title: "Housing: Vacancies & House Seekers | Moi University",
  description: "Find a rental, list a vacancy or help a comrade find a house around Moi University. Free community posts and replies, no account required. Inspect before paying.",
  alternates: { canonical: "/housing" },
};

export default function HousingPage() {
  return (
    <div className="interior-page requests-page housing-page">
      <Navbar />
      <main className="mx-auto w-full max-w-6xl px-4 pb-28 pt-5 sm:px-6 sm:pt-8">
        <RequestBoard housingOnly />
      </main>
      <Footer />
      <BottomNav />
    </div>
  );
}
