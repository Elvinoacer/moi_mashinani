import { survivalMatch } from "./campus-value";
import { mapPrismaBusiness } from "./store";
import { prisma } from "./prisma";
import type { FlashDeal } from "./types";
export async function activeFlashDeals(): Promise<FlashDeal[]> {
  const now = new Date();
  const deals = await prisma.flashDeal.findMany({
    where: {
      closedAt: null,
      endsAt: { gt: now },
      OR: [{ dropAt: null }, { dropAt: { gt: now } }],
      business: { status: "ACTIVE", isTemporarilyClosed: false },
    },
    include: { business: true, _count: { select: { joins: true } } },
    orderBy: { endsAt: "asc" },
    take: 100,
  });
  return deals
    .filter((d) =>
      survivalMatch(mapPrismaBusiness(d.business), "all", now.getTime()),
    )
    .map((d) => ({
      id: d.id,
      businessId: d.businessId,
      title: d.title,
      priceKes: d.priceKes,
      endsAt: d.endsAt.toISOString(),
      dropZone: d.dropZone || undefined,
      dropAt: d.dropAt?.toISOString(),
      deliveryFeeKes: d.deliveryFeeKes ?? undefined,
      joins: d._count.joins,
      businessName: d.business.name,
      slug: d.business.slug,
      zone: d.business.zone,
      whatsapp: d.business.whatsapp || d.business.phone,
      sponsored: Boolean(
        d.business.dealBlastEndsAt && d.business.dealBlastEndsAt > now,
      ),
    }))
    .sort((a, b) => Number(b.sponsored) - Number(a.sponsored));
}
