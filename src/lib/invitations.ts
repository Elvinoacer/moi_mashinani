import { randomBytes } from 'node:crypto';
import { prisma } from './prisma';
import { hashToken } from './auth';
import { sendVerificationEmail } from './mail';

export async function inviteAccount(accountId: string, businessId?: string, purpose = 'INVITE') {
  const account = await prisma.account.findUniqueOrThrow({ where: { id: accountId } });
  const token = randomBytes(32).toString('hex');
  const record = await prisma.verificationToken.create({ data: { accountId, businessId, purpose, tokenHash: hashToken(token), expiresAt: new Date(Date.now() + 24 * 3600e3) } });
  try {
    await sendVerificationEmail(account.email, account.name, token, purpose);
    // Retain old valid links until delivery succeeds; invalidate others only after acceptance.
    await prisma.verificationToken.updateMany({ where: { accountId, id: { not: record.id }, purpose, businessId: businessId || null, usedAt: null }, data: { usedAt: new Date() } });
    if (businessId) await prisma.business.update({ where: { id: businessId }, data: { invitationSentAt: new Date(), invitationError: null } });
    return { sent: true };
  } catch (error) {
    await prisma.verificationToken.delete({ where: { id: record.id } });
    const message = error instanceof Error && /configured|HTTPS|APP_URL/.test(error.message) ? error.message : 'Email delivery failed. Check email settings and resend the invitation.';
    if (businessId) await prisma.business.update({ where: { id: businessId }, data: { invitationError: message } });
    return { sent: false, error: message };
  }
}
