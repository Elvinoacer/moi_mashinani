import type { Metadata } from "next";
import { Store } from "@/lib/store";
import { connection } from "next/server";
import { publicBusiness } from "@/lib/business-input";
import { publicListing } from "@/lib/campus-value";
import {
  SITE_URL,
  CORE_CAMPUS_KEYWORDS,
  generateBreadcrumbSchema,
  safeJsonLd,
} from "@/lib/seo";
import { DealsPageClient } from "./DealsPageClient";

export const metadata: Metadata = {
  title:
    "Student Deals & Budget Finds | Moi University, Kesses",
  description:
    "Find seller-listed items under KES 300, limited-time campus deals and student offers in Kesses. Compare prices and contact nearby sellers directly.",
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
      "Student Deals & Budget Finds | Moi University, Kesses",
    description:
      "Browse affordable campus essentials, limited-time offers and student discounts around Moi University in Kesses.",
    url: "/deals",
    siteName: "MoiMashinani",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Student Deals & Budget Finds | Moi University (Kesses)",
    description:
      "Browse affordable campus finds, student discounts and limited-time deals in Kesses.",
  },
};

export default async function DealsAndSafetyPage() {
  await connection();
  const now = Date.now();
  const all = (await Store.getBusinesses())
    .filter((business) => publicListing(business, now) && !business.isTemporarilyClosed)
    .map(publicBusiness);
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
  // Keep useful local variety: avoid the old global top-12 cutoff that could
  // exclude an entire campus zone before the visitor chooses where to shop.
  // Item photos are used only when the seller uploaded a photo for that item.
  const affordable = all.flatMap((business) =>
    business.services
      .filter((service) =>
        service.inStock !== false &&
        typeof service.priceFrom === "number" &&
        Number.isFinite(service.priceFrom) &&
        service.priceFrom >= 0 &&
        service.priceFrom <= 300,
      )
      .map((service) => ({
        id: business.id + "-" + service.id,
        serviceId: service.id,
        businessId: business.id,
        name: service.name,
        price: service.priceFrom!,
        businessName: business.name,
        slug: business.slug,
        zone: business.zone,
        servesZones: business.servesZones,
        whatsapp: business.whatsapp || business.phone,
        photo: service.photo || "",
        verified: business.verificationLevel === "L2",
      })),
  ).sort((a, b) => a.price - b.price);

  // Round-robin by business so a shop with a large catalogue cannot occupy
  // all the first rows. Preserve cheapest-first order within each business.
  const byBusiness = new Map<string, typeof affordable>();
  for (const item of affordable) {
    const group = byBusiness.get(item.businessId) || [];
    group.push(item);
    byBusiness.set(item.businessId, group);
  }
  const budget: typeof affordable = [];
  let nextRound = true;
  while (nextRound) {
    nextRound = false;
    for (const group of byBusiness.values()) {
      const item = group.shift();
      if (item) {
        budget.push(item);
        nextRound = true;
      }
    }
  }

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
