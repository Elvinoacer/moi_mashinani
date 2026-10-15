import { survivalMatch } from "@/lib/campus-value";
import { mapPrismaBusiness } from "@/lib/store";
import { randomBytes } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiError, ApiError, assertSameOrigin } from "@/lib/api";
import { hashToken } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import { whatsappUrl } from "@/lib/whatsapp";
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    assertSameOrigin(req);
    await rateLimit(req, "join-drop", 30);
    const { id } = await params;
    const existing = req.cookies.get("mm_drop_session")?.value;
    const session =
      existing && /^[a-f0-9]{64}$/.test(existing)
        ? existing
        : randomBytes(32).toString("hex");
    const result = await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT "id" FROM "FlashDeal" WHERE "id" = ${id} FOR UPDATE`;
      const deal = await tx.flashDeal.findUnique({
        where: { id },
        include: { business: true },
      });
      if (
        !deal ||
        deal.closedAt ||
        deal.endsAt <= new Date() ||
        !deal.dropZone ||
        !deal.dropAt ||
        deal.dropAt <= new Date() ||
        !survivalMatch(mapPrismaBusiness(deal.business), "all", Date.now())
      )
        throw new ApiError(410, "This delivery drop has ended.");
      await tx.dropJoin.upsert({
        where: {
          dealId_sessionHash: { dealId: id, sessionHash: hashToken(session) },
        },
        create: { dealId: id, sessionHash: hashToken(session) },
        update: {},
      });
      return {
        joins: await tx.dropJoin.count({ where: { dealId: id } }),
        url: whatsappUrl(
          deal.business.whatsapp || deal.business.phone,
          `I’d like to join your Moi Mashinani delivery drop: ${deal.title}, KES ${deal.priceKes}, to ${deal.dropZone} at ${deal.dropAt.toLocaleString("en-KE", { timeZone: "Africa/Nairobi" })}. Delivery fee KES ${deal.deliveryFeeKes}. Please confirm my order and meeting point.`,
        ),
      };
    });
    const response = NextResponse.json(result, {
      headers: { "Cache-Control": "private, no-store" },
    });
    response.cookies.set("mm_drop_session", session, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 30 * 86400,
      path: "/",
    });
    return response;
  } catch (error) {
    return apiError(error);
  }
}
