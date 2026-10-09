import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { normalizeEmail } from '@/lib/auth';
import { apiError, assertSameOrigin, jsonBody } from '@/lib/api';
import { inviteAccount } from '@/lib/invitations';
import { rateLimit } from '@/lib/rate-limit';
export async function POST(req: NextRequest) {
  try {
    assertSameOrigin(req);
    await rateLimit(req,'request-link',5,900);
    const body = await jsonBody(req);
    const email = normalizeEmail(body.email);
    await rateLimit(req,'request-link-account',3,900,email);
    const account = await prisma.account.findUnique({where:{email}});
    if (account) await inviteAccount(account.id,undefined,account.passwordHash ? 'RESET':'INVITE');
    return NextResponse.json({success:true,message:'If an account exists for this email, a verification or password reset link will be sent.'});
  } catch(error) { return apiError(error); }
}
