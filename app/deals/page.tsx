import type { Metadata } from "next";
import { Store } from "@/lib/store";
import { connection } from "next/server";
import { publicBusiness } from "@/lib/business-input";
import {
  SITE_URL,
  CORE_CAMPUS_KEYWORDS,
  generateBreadcrumbSchema,
  safeJsonLd,
} from "@/lib/seo";
import { DealsPageClient } from "./DealsPageClient";

export const metadata: Metadata = {
  title:
    "Student Deals, Discounts & Campus Trust Guide | Moi University (Kesses)",
  description:
    "Exclusive Moi University student discounts in Kesses: save money on food, phone repairs, haircuts, printing and campus essentials with our safety guide.",
  keywords: [
    "student discounts Moi University",
    "campus deals Kesses",
    "cheap food Moi University",
    "student offers Eldoret",
    "Moi University discounts",
    "cheap kinyozi Kesses",
    ...CORE_CAMPUS_KEYWORDS.slice(0, 15),
  ],
  alternates: {
    canonical: "/deals",
  },
  openGraph: {
    title:
      "Student Deals, Discounts & Campus Trust Guide | Moi University (Kesses)",
    description:
      "Exclusive Moi University student discounts in Kesses. Save money on food, phone repairs, haircuts, printing and campus essentials.",
    url: "/deals",
    siteName: "MoiMashinani",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Student Deals & Discounts | Moi University (Kesses)",
    description:
      "Find active student discounts and budget offers around campus.",
  },
};

export default async function DealsAndSafetyPage() {
  await connection();
  const all = (await Store.getBusinesses())
    .filter((b) => b.status === "ACTIVE" && !b.isTemporarilyClosed)
    .map(publicBusiness);
  const now = new Date().getTime();
  const deals = all
    .filter((b) => Boolean(b.studentDiscount))
    .sort(
      (a, b) =>
        Number(
          Boolean(b.dealBlastEndsAt && Date.parse(b.dealBlastEndsAt) > now),
        ) -
        Number(
          Boolean(a.dealBlastEndsAt && Date.parse(a.dealBlastEndsAt) > now),
        ),
    );
  const budget = all
    .flatMap((b) =>
      b.services
        .filter(
          (s) =>
            s.inStock !== false &&
            s.priceFrom !== undefined &&
            s.priceFrom <= 300,
        )
        .map((s) => ({
          id: b.id + "-" + s.id,
          name: s.name,
          price: s.priceFrom!,
          businessName: b.name,
          slug: b.slug,
          zone: b.zone,
        })),
    )
    .sort((a, b) => a.price - b.price)
    .slice(0, 12);

  const breadcrumbsSchema = generateBreadcrumbSchema([
    { name: "Home", url: "/" },
    { name: "Student Deals", url: "/deals" },
  ]);

  const dealsItemListSchema = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Active Moi University Student Discounts & Offers",
    description:
      "Verified student discounts in Kesses across food, electronics repair, haircuts, and supplies.",
    numberOfItems: deals.length,
    itemListElement: deals.map((biz, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: `${biz.name} — ${biz.studentDiscount}`,
      url: `${SITE_URL}/b/${biz.slug}`,
      description: biz.studentDiscount,
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(breadcrumbsSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(dealsItemListSchema) }}
      />
      <DealsPageClient initialDeals={deals} initialBudget={budget} />
    </>
  );
}
