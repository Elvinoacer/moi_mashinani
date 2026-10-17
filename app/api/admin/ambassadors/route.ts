import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, normalizeEmail } from "@/lib/auth";
import {
  ApiError,
  apiError,
  assertSameOrigin,
  jsonBody,
  textField,
} from "@/lib/api";
import { inviteAccount } from "@/lib/invitations";
export async function GET(req: NextRequest) {
  try {
    await requireAdmin(req);
    const accounts = await prisma.account.findMany({
      where: { role: { in: ["ADMIN", "AMBASSADOR"] } },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        emailVerifiedAt: true,
      },
    });
    const [businesses, audits, payments] = await Promise.all([
      prisma.business.findMany({
        where: { ambassadorId: { not: null } },
        select: { id: true, ambassadorId: true, verificationLevel: true },
      }),
      prisma.businessAudit.findMany({
        where: { action: { in: ["FIELD_ENROLLED", "FIELD_VERIFIED"] } },
        select: { actorId: true, businessId: true },
      }),
      prisma.paymentRecord.findMany({
        where: { state: "COMPLETE" },
        orderBy: { createdAt: "asc" },
        select: { businessId: true, amountKes: true },
      }),
    ]);
    return NextResponse.json(
      accounts.map((a) => {
        const myBizIds = new Set(
          businesses.filter((b) => b.ambassadorId === a.id).map((b) => b.id),
        );
        const seenBiz = new Set<string>();
        let revenueKes = 0;
        let commissionKes = 0;
        for (const p of payments) {
          if (!myBizIds.has(p.businessId)) continue;
          revenueKes += p.amountKes;
          const isFirst = !seenBiz.has(p.businessId);
          seenBiz.add(p.businessId);
          commissionKes += Math.round(p.amountKes * (isFirst ? 0.25 : 0.1));
        }
        return {
          ...a,
          enrolled: myBizIds.size,
          verified: new Set(
            audits.filter((e) => e.actorId === a.id).map((e) => e.businessId),
          ).size,
          paidConversions: seenBiz.size,
          revenueKes,
          commissionKes,
        };
      }),
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    return apiError(error);
  }
}
export async function POST(req: NextRequest) {
  try {
    assertSameOrigin(req);
    await requireAdmin(req);
    const body = await jsonBody(req);
    const email = normalizeEmail(body.email);
    const name = textField(body.name, "Ambassador name", 100, true);
    const existing = await prisma.account.findUnique({ where: { email } });
    if (existing && existing.role !== "AMBASSADOR")
      throw new ApiError(409, "Use a separate email for this field account.");
    const account =
      existing ||
      (await prisma.account.create({
        data: { email, name, role: "AMBASSADOR" },
      }));
    return NextResponse.json({ invitation: await inviteAccount(account.id) });
  } catch (error) {
    return apiError(error);
  }
}
