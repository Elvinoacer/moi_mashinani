import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { hashToken, hashPassword, verifyPassword, newSession, publicUser, setSessionCookie, validatePassword } from '@/lib/auth';
import { ApiError, apiError, assertSameOrigin, jsonBody, textField } from '@/lib/api';
import { rateLimit } from '@/lib/rate-limit';
export async function POST(req: NextRequest) {
  try {
    assertSameOrigin(req);
    await rateLimit(req,'verify',20);
    const body = await jsonBody(req);
    const token = textField(body.token,'Verification token',64,true);
    validatePassword(body.password);
    const password = body.password;
    const passwordHash = await hashPassword(password);
    const result = await prisma.$transaction(async tx => {
      const record = await tx.verificationToken.findUnique({where:{tokenHash:hashToken(token)},include:{account:true}});
      if (!record || record.usedAt || record.expiresAt <= new Date()) throw new ApiError(400,'This verification link is invalid or expired. Request a new link.');
      if (record.purpose === 'INVITE' && record.account.passwordHash && !await verifyPassword(password,record.account.passwordHash)) throw new ApiError(400,'This email already has an account. Enter your existing password or request a password reset.');
      const consumed = await tx.verificationToken.updateMany({where:{id:record.id,usedAt:null,expiresAt:{gt:new Date()}},data:{usedAt:new Date()}});
      if (consumed.count !== 1) throw new ApiError(400,'This link has already been used');
      const account = await tx.account.update({where:{id:record.accountId},data:{emailVerifiedAt:record.account.emailVerifiedAt || new Date(),passwordHash:record.purpose === 'RESET' || !record.account.passwordHash ? passwordHash : record.account.passwordHash}});
      if (record.purpose === 'RESET') {
        await tx.accountSession.deleteMany({where:{accountId:account.id}});
        await tx.verificationToken.updateMany({where:{accountId:account.id,usedAt:null},data:{usedAt:new Date()}});
      }
      await tx.business.updateMany({where:{ownerId:account.id},data:{isClaimed:true}});
      const business = record.businessId ? await tx.business.findUnique({where:{id:record.businessId}}) : await tx.business.findFirst({where:{ownerId:account.id}});
      return {account,business};
    });
    return setSessionCookie(NextResponse.json({user:publicUser(result.account),business:result.business ? {slug:result.business.slug,status:result.business.status} : null}),await newSession(result.account.id));
  } catch(error) { return apiError(error); }
}
