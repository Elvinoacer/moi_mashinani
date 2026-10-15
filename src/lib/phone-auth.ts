import { randomInt, randomUUID } from "node:crypto";
import { prisma } from "./prisma";
import { hashToken } from "./auth";
import { ApiError } from "./api";
import { sendRequestSms, smsConfigured } from "./sms";
export async function requestPhoneCode(
  phone: string,
  name: string,
  sender = sendRequestSms,
) {
  if (sender === sendRequestSms && !smsConfigured())
    throw new ApiError(
      503,
      "SMS sign-in is not configured yet. Use phone/email and password below.",
    );
  // A public shop contact number is never sufficient evidence of account ownership.
  const id = randomUUID(),
    code = String(randomInt(100000, 1000000));
  await prisma.phoneChallenge.create({
    data: {
      id,
      phone,
      name,
      codeHash: hashToken(`${id}:${code}`),
      expiresAt: new Date(Date.now() + 5 * 60000),
    },
  });
  try {
    await sender(
      phone,
      `Moi Mashinani sign-in code: ${code}. Expires in 5 minutes. Never share it.`,
    );
  } catch {
    await prisma.phoneChallenge.delete({ where: { id } });
    throw new ApiError(
      503,
      "The SMS could not be sent. Please try again or use password sign-in.",
    );
  }
  return id;
}
export async function verifyPhoneCode(id: string, code: string) {
  const result = await prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT "id" FROM "PhoneChallenge" WHERE "id" = ${id} FOR UPDATE`;
    const challenge = await tx.phoneChallenge.findUnique({ where: { id } });
    if (
      !challenge ||
      challenge.usedAt ||
      challenge.expiresAt <= new Date() ||
      challenge.attempts >= 5
    )
      return null;
    if (
      !/^\d{6}$/.test(code) ||
      challenge.codeHash !== hashToken(`${id}:${code}`)
    ) {
      await tx.phoneChallenge.update({
        where: { id },
        data: { attempts: { increment: 1 } },
      });
      return null;
    }
    await tx.$queryRaw`SELECT 1 FROM (SELECT pg_advisory_xact_lock(hashtext(${challenge.phone}))) AS guard`;
    let account = await tx.account.findUnique({
      where: { phone: challenge.phone },
    });
    if (!account) {
      // Upgrade an existing merchant only when a unique owner phone was accepted by an email-verified owner.
      const owners = await tx.business.findMany({
        where: {
          ownerPhone: challenge.phone,
          isClaimed: true,
          owner: { emailVerifiedAt: { not: null }, role: "BUSINESS" },
        },
        select: { ownerId: true },
      });
      const ids = [...new Set(owners.map((b) => b.ownerId!))];
      if (ids.length > 1)
        throw new ApiError(
          409,
          "This phone is shared by several accounts. Use email/password to sign in.",
        );
      if (ids.length === 1)
        account = await tx.account.update({
          where: { id: ids[0] },
          data: { phone: challenge.phone, phoneVerifiedAt: new Date() },
        });
      else
        account = await tx.account.create({
          data: {
            email: `${challenge.phone.slice(1)}@phone.moimashinani.invalid`,
            phone: challenge.phone,
            phoneVerifiedAt: new Date(),
            name: challenge.name || "Comrade",
            role: "BUSINESS",
          },
        });
    }
    if (!account.phoneVerifiedAt)
      account = await tx.account.update({
        where: { id: account.id },
        data: { phoneVerifiedAt: new Date() },
      });
    if (account.role === "BUSINESS")
      await tx.business.updateMany({
        where: {
          ownerId: account.id,
          ownerPhone: challenge.phone,
          status: "ACTIVE",
          verificationLevel: "L2",
        },
        data: { isClaimed: true },
      });
    await tx.phoneChallenge.update({
      where: { id },
      data: { usedAt: new Date() },
    });
    return account;
  });
  if (!result)
    throw new ApiError(
      400,
      "Invalid, expired or already used code. Request a new code after five failed attempts.",
    );
  return result;
}
