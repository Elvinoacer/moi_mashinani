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
    const [businesses, audits] = await Promise.all([
      prisma.business.findMany({
        where: { ambassadorId: { not: null } },
        select: { ambassadorId: true, verificationLevel: true },
      }),
      prisma.businessAudit.findMany({
        where: { action: { in: ["FIELD_ENROLLED", "FIELD_VERIFIED"] } },
        select: { actorId: true, businessId: true },
      }),
    ]);
    return NextResponse.json(
      accounts.map((a) => ({
        ...a,
        enrolled: businesses.filter((b) => b.ambassadorId === a.id).length,
        verified: new Set(
          audits.filter((e) => e.actorId === a.id).map((e) => e.businessId),
        ).size,
      })),
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
