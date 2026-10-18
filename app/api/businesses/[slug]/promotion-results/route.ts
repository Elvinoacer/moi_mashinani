import { NextRequest, NextResponse } from "next/server";
import { requireBusinessAccess } from "@/lib/auth";
import { apiError, ApiError } from "@/lib/api";
import { Store } from "@/lib/store";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest, props: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await props.params;
    const business = await Store.getBusinessBySlug(slug);
    if (!business) throw new ApiError(404, "Business not found");
    await requireBusinessAccess(req, business);
    const now = new Date();
    const payment = await prisma.paymentRecord.findFirst({
      where: {
        businessId: business.id,
        state: "COMPLETE",
        method: "INTASEND_CHECKOUT",
        planId: { in: ["RECOMMENDED", "FEATURED"] },
        paidAt: { gte: business.tierStartsAt ? new Date(business.tierStartsAt) : new Date(now.getTime() - 30 * 864e5) },
      },
      orderBy: [{ paidAt: "desc" }, { id: "desc" }],
      select: { paidAt: true },
    });
    const since = payment?.paidAt ??
      (business.proStartsAt ? new Date(business.proStartsAt) : new Date(now.getTime() - 30 * 864e5));
    const rows = await prisma.businessEvent.groupBy({
      by: ["type"],
      where: { businessId: business.id, createdAt: { gte: since, lte: now } },
      _count: { _all: true },
    });
    const counts = Object.fromEntries(rows.map((row) => [row.type, row._count._all]));
    return NextResponse.json({
      since: since.toISOString(),
      asOf: now.toISOString(),
      period: payment ? "Since your latest boost payment" : business.proStartsAt ? "Since your Pro plan started" : "Last 30 days",
      impressions: counts.impression ?? 0,
      views: counts.view ?? 0,
      calls: counts.call ?? 0,
      whatsapp: counts.whatsapp ?? 0,
      bookings: counts.booking ?? 0,
      contacts: (counts.call ?? 0) + (counts.whatsapp ?? 0) + (counts.booking ?? 0),
    }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    return apiError(error);
  }
}
