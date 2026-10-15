import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword, normalizeEmail } from "@/lib/auth";
import { ApiError, apiError, assertSameOrigin, jsonBody, textField } from "@/lib/api";
import { rateLimit } from "@/lib/rate-limit";
import { inviteAccount } from "@/lib/invitations";

export async function POST(req: NextRequest) {
  try {
    assertSameOrigin(req);
    await rateLimit(req, "email-signup-ip", 8, 3600);
    const body = await jsonBody(req);
    const email = normalizeEmail(body.email);
    const name = textField(body.name, "Name", 120, true);
    await rateLimit(req, "email-signup-address", 3, 3600, email);
    const passwordHash = await hashPassword(body.password as string);
    const existing = await prisma.account.findUnique({
      where: { email },
      select: { id: true, emailVerifiedAt: true, passwordHash: true },
    });
    if (existing && !existing.emailVerifiedAt) {
      // A previously invited owner can finish setup without creating a
      // duplicate account. Never replace their password before verification.
      const pending = await prisma.business.findFirst({
        where: { ownerId: existing.id, isClaimed: false },
        select: { id: true },
        orderBy: { createdAt: "desc" },
      });
      await inviteAccount(
        existing.id,
        pending?.id,
        pending ? "INVITE" : existing.passwordHash ? "REGISTER" : "INVITE",
      );
    }
    if (!existing) {
      // Only a verified email can claim business ownership. Never grant an elevated role here.
      const account = await prisma.account.create({
        data: { email, name, passwordHash, role: "BUSINESS" },
      }).catch((error: unknown) => {
        if (typeof error === "object" && error && "code" in error && error.code === "P2002") return null;
        throw error;
      });
      if (account) {
        const invitation = await inviteAccount(account.id, undefined, "REGISTER");
        if (!invitation.sent) throw new ApiError(503, "Account created, but verification email could not be sent. Request a new account link from sign in.");
      }
    }
    return NextResponse.json({
      message: "If this address is new, check your inbox for a verification link. If you already have an account, sign in or request an account link.",
    }, { status: 202, headers: { "Cache-Control": "no-store" } });
  } catch (error) { return apiError(error); }
}
