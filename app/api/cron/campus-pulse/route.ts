import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiError, ApiError } from "@/lib/api";
import { createMerchantAction } from "@/lib/merchant-actions";
import { queueNotice, deliverNotifications } from "@/lib/notifications";
export const maxDuration = 25;
export async function GET(req: NextRequest) {
  try {
    if (!process.env.CRON_SECRET)
      throw new ApiError(503, "Cron authentication is not configured");
    if (
      req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`
    )
      throw new ApiError(401, "Unauthorized");
    const date = new Date().toLocaleDateString("en-CA", {
      timeZone: "Africa/Nairobi",
    });
    const ids = await prisma.$queryRaw<Array<{ id: string }>>`
      SELECT b."id" FROM "Business" b WHERE b."status" = 'ACTIVE' AND b."isClaimed" = true AND b."isTemporarilyClosed" = false
      AND b."requestAlertsEnabled" = true AND b."verificationLevel" = 'L2' AND b."ownerId" IS NOT NULL
      AND NOT EXISTS (SELECT 1 FROM "Notification" n WHERE n."accountId" = b."ownerId" AND n."eventKey" = ${`morning/${date}/`} || b."id")
      ORDER BY b."id" LIMIT 20`;
    const businesses = await prisma.business.findMany({
      where: { id: { in: ids.map((b) => b.id) } },
    });
    for (const business of businesses)
      await prisma.$transaction(async (tx) => {
        const path = await createMerchantAction(tx, business, "OPEN");
        await queueNotice(
          tx,
          business.ownerId,
          `morning/${date}/${business.id}`,
          {
            kind: "MORNING_PING",
            title: `Good morning ${business.name}`,
            body: "Are you open today? Tap to confirm for four hours.",
            path: path!,
            button: "Confirm open now",
          },
          ["SMS"],
          business.id,
        );
      });
    // A Pro plan promotes real, currently active offers once a day to opted-in accounts.
    const deals = await prisma.flashDeal.findMany({
      where: {
        endsAt: { gt: new Date() },
        closedAt: null,
        business: {
          proEndsAt: { gt: new Date() },
          status: "ACTIVE",
          isTemporarilyClosed: false,
        },
      },
      include: { business: true },
      take: 20,
    });
    for (const deal of deals) {
      const audience = await prisma.pushDevice.findMany({
        where: {
          enabled: true,
          declined: false,
          scopeBusinessId: null,
          token: { not: null },
          accountId: { not: deal.business.ownerId || "" },
        },
        distinct: ["accountId"],
        select: { accountId: true },
        take: 100,
      });
      await prisma.$transaction(async (tx) => {
        for (const person of audience)
          await queueNotice(
            tx,
            person.accountId,
            `daily-deal/${date}/${deal.businessId}`,
            {
              kind: "DEAL",
              title: deal.business.name,
              body: `${deal.title} · KES ${deal.priceKes}`,
              path: "/deals",
              button: "View today’s deal",
            },
            ["PUSH"],
          );
      });
    }
    await prisma.merchantAction.deleteMany({
      where: { expiresAt: { lt: new Date(Date.now() - 7 * 864e5) } },
    });
    await prisma.phoneChallenge.deleteMany({
      where: { expiresAt: { lt: new Date(Date.now() - 864e5) } },
    });
    return NextResponse.json(
      {
        morningPings: businesses.length,
        dailyOffers: deals.length,
        delivery: await deliverNotifications(10, 10000),
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return apiError(error);
  }
}
