import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { normalizeEmail, verifyPassword, hashPassword, newSession, publicUser, setSessionCookie } from '@/lib/auth';
import { ApiError, apiError, assertSameOrigin, jsonBody } from '@/lib/api';
import { rateLimit } from '@/lib/rate-limit';
export async function POST(req: NextRequest) {
  try {
    assertSameOrigin(req);
    await rateLimit(req,'login',20);
    const body = await jsonBody(req);
    const email = normalizeEmail(body.email);
    await rateLimit(req,'login-account',10,900,email);
    const account = await prisma.account.findUnique({where:{email}});
    const dummy = await hashPassword('dummy password for timing');
    const ok = typeof body.password === 'string' && await verifyPassword(body.password,account?.passwordHash || dummy);
    if (!account || !ok || !account.emailVerifiedAt) throw new ApiError(401,'Email or password is incorrect, or the email has not been verified');
    return setSessionCookie(NextResponse.json({user:publicUser(account)}),await newSession(account.id));
  } catch(error) { return apiError(error); }
}
