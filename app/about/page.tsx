import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, MapPin, Search, Store, MessageCircle } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { BottomNav } from "@/components/BottomNav";
import { generateBreadcrumbSchema, safeJsonLd } from "@/lib/seo";

export const metadata: Metadata = {
  title: "About Moi Mashinani — The Moi University Campus Business Directory",
  description:
    "What is Moi Mashinani? Discover the digital marketplace connecting Moi University students in Kesses with nearby food, hostels, shops, repairs, printing and local services.",
  alternates: { canonical: "/about" },
  openGraph: {
    title: "About Moi Mashinani | Made for Moi University, Kesses",
    description:
      "Meet Moi Mashinani, the platform that helps students find campus businesses and contact sellers directly near Moi University Main Campus.",
    url: "/about",
    siteName: "Moi Mashinani",
    type: "website",
  },
};

const steps = [
  {
    number: "01",
    title: "Discover nearby businesses",
    detail: "Browse campus categories, search for what you need and narrow results to the area around you.",
    icon: Search,
  },
  {
    number: "02",
    title: "Compare what is offered",
    detail: "Read business details, explore published products and prices, and check the seller's contact information.",
    icon: Store,
  },
  {
    number: "03",
    title: "Contact the seller directly",
    detail: "Use a business's phone or WhatsApp details to ask questions, arrange collection or discuss an appointment.",
    icon: MessageCircle,
  },
];

export default function AboutMoiMashinaniPage() {
  const breadcrumbs = generateBreadcrumbSchema([
    { name: "Home", url: "/" },
    { name: "About Moi Mashinani", url: "/about" },
  ]);

  return (
    <div className="interior-page flex min-h-screen flex-col">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(breadcrumbs) }} />
      <Navbar />
      <main className="mx-auto w-full max-w-[1120px] flex-1 px-4 pb-24 pt-8 sm:px-6 sm:pt-12 lg:px-8">
        <div className="rounded-[28px] border border-[#dbe7d6] bg-[linear-gradient(130deg,#eff5e6,#ffffff_72%)] px-6 py-10 sm:px-10 sm:py-14">
          <p className="inline-flex items-center gap-2 text-xs font-extrabold uppercase tracking-[0.17em] text-[#386346]">
            <MapPin aria-hidden="true" className="h-4 w-4" /> Moi University · Kesses, Kenya
          </p>
          <h1 className="mt-4 max-w-3xl font-display text-4xl font-extrabold leading-tight text-[#183e35] sm:text-5xl">
            Meet Moi Mashinani.
            <span className="mt-2 block text-[#4d7546]">Campus, connected.</span>
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-8 text-[#53685a]">
            Moi Mashinani is a local business discovery platform built around Moi University Main Campus in Kesses.
            It helps students and neighbors find the people and businesses behind the food, rooms, repairs,
            supplies and services they need every day.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link href="/search" className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#183e35] px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-[#315945]">
              Explore businesses <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
            <Link href="/onboard" className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-[#bdceb9] bg-white px-5 py-3 text-sm font-bold text-[#234b36] transition-colors hover:bg-[#f3f8ec]">
              List your business
            </Link>
          </div>
        </div>

        <section className="py-11 sm:py-14" aria-labelledby="how-it-works">
          <p className="text-xs font-bold uppercase tracking-wider text-[#66836b]">How it works</p>
          <h2 id="how-it-works" className="mt-2 text-2xl font-extrabold text-[#183e35] sm:text-3xl">
            From searching to getting sorted.
          </h2>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {steps.map(({ number, title, detail, icon: Icon }) => (
              <article key={number} className="rounded-2xl border border-[#e1e8dd] bg-white p-6">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold tracking-wider text-[#728674]">{number}</span>
                  <Icon className="h-5 w-5 text-[#476f4e]" aria-hidden="true" />
                </div>
                <h3 className="mt-5 text-lg font-bold text-[#183e35]">{title}</h3>
                <p className="mt-2 text-sm leading-7 text-[#657268]">{detail}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="grid gap-8 border-t border-[#dce5d7] py-10 lg:grid-cols-[0.85fr_1.15fr]" aria-labelledby="find-around-moi">
          <div>
            <h2 id="find-around-moi" className="text-2xl font-extrabold text-[#183e35]">
              Made for everyday life around Moi.
            </h2>
            <p className="mt-3 text-sm leading-7 text-[#657268]">
              Moi Mashinani focuses on Kesses and the communities surrounding Moi University.
              Instead of searching through scattered contacts or group messages, explore local listings in one place.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {[
              { text: "Food, cafes and meals", href: "/c/food-cafes" },
              { text: "Hostels and student rooms", href: "/c/hostels-rooms" },
              { text: "Phone and laptop repairs", href: "/c/phone-laptop-repair" },
              { text: "Printing and cyber services", href: "/c/printing-cyber" },
              { text: "Hair salons and kinyozi", href: "/c/hair-beauty-kinyozi" },
              { text: "Browse all categories", href: "/categories" },
            ].map((item) => (
              <Link key={item.href} href={item.href} className="flex min-h-14 items-center justify-between gap-3 rounded-xl border border-[#e0e8dd] bg-white px-4 py-3 text-sm font-semibold text-[#244a36] transition-colors hover:bg-[#f1f7e9]">
                {item.text} <ArrowRight className="h-4 w-4 shrink-0" aria-hidden="true" />
              </Link>
            ))}
          </div>
        </section>

        <section className="rounded-2xl bg-[#eaf2e3] p-6 sm:p-8" aria-labelledby="for-businesses">
          <h2 id="for-businesses" className="text-xl font-bold text-[#183e35]">Are you running a business near campus?</h2>
          <p className="mt-2 max-w-3xl text-sm leading-7 text-[#53685a]">
            Create a business profile for your products or services, show where customers can find you,
            publish contact details and manage your catalogue. Listing is free; optional paid promotions are separate.
          </p>
          <Link href="/onboard" className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-[#24543b] underline underline-offset-4">
            Get started with your listing <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </section>

        <p className="mt-8 text-sm leading-7 text-[#657268]">
          Looking for <strong>MoiMashinani</strong>, <strong>moimashinani</strong> or <strong>Moishanani</strong>?
          You are in the right place. The platform's official name is <strong>Moi Mashinani</strong>.
        </p>
      </main>
      <Footer />
      <BottomNav />
    </div>
  );
}
