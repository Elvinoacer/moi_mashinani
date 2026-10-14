import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  normalizeEmail,
  verifyPassword,
  hashPassword,
  newSession,
  publicUser,
  setSessionCookie,
} from "@/lib/auth";
import { ApiError, apiError, assertSameOrigin, jsonBody } from "@/lib/api";
import { phoneField } from "@/lib/business-input";
import { rateLimit } from "@/lib/rate-limit";
export async function POST(req: NextRequest) {
  try {
    assertSameOrigin(req);
    await rateLimit(req, "login", 20);
    const body = await jsonBody(req);
    const identifier =
      typeof body.identifier === "string" ? body.identifier.trim() : body.email;
    const isEmail = typeof identifier === "string" && identifier.includes("@");
    const normalized = isEmail
      ? normalizeEmail(identifier)
      : phoneField(identifier);
    await rateLimit(req, "login-account", 10, 900, normalized);
    const matches = isEmail
      ? []
      : await prisma.business.findMany({
          where: {
            ownerPhone: normalized,
            isClaimed: true,
            ownerId: { not: null },
          },
          select: { ownerId: true },
        });
    const ownerIds = [...new Set(matches.map((b) => b.ownerId!))];
    // Shared shop contact numbers are not authentication identities.
    const account = isEmail
      ? await prisma.account.findUnique({ where: { email: normalized } })
      : ownerIds.length === 1
        ? await prisma.account.findUnique({ where: { id: ownerIds[0] } })
        : null;
    const dummy = await hashPassword("dummy password for timing");
    const ok =
      typeof body.password === "string" &&
      (await verifyPassword(body.password, account?.passwordHash || dummy));
    if (!account || !ok || !account.emailVerifiedAt)
      throw new ApiError(
        401,
        "Phone/email or password is incorrect, or the email has not been verified",
      );
    return setSessionCookie(
      NextResponse.json({ user: publicUser(account) }),
      await newSession(account.id),
    );
  } catch (error) {
    return apiError(error);
  }
}
