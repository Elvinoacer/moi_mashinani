import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { SESSION_COOKIE, hashToken } from '@/lib/auth';
import { apiError, assertSameOrigin } from '@/lib/api';
export async function POST(req: NextRequest) {
  try {
    assertSameOrigin(req);
    const token = req.cookies.get(SESSION_COOKIE)?.value;
    if (token) await prisma.accountSession.deleteMany({where:{tokenHash:hashToken(token)}});
    const response = NextResponse.json({success:true});
    response.cookies.set(SESSION_COOKIE,'',{maxAge:0,path:'/',httpOnly:true,sameSite:'lax',secure:process.env.NODE_ENV==='production'});
    return response;
  } catch(error) { return apiError(error); }
}
