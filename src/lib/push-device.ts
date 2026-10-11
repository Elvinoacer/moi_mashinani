import { randomBytes } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from './prisma';
import { getCurrentUser, hashToken, SESSION_COOKIE } from './auth';
import { ApiError } from './api';
export const PUSH_COOKIE = 'mm_push_device';
export function setPushCookie(response: NextResponse, binding: string) {
  response.cookies.set(PUSH_COOKIE,binding,{httpOnly:true,secure:process.env.NODE_ENV === 'production',sameSite:'strict',path:'/',maxAge:365*86400});
}
export async function enrollmentPushBinding(response: NextResponse, accountId: string, businessId: string) {
  const binding = randomBytes(32).toString('hex');
  await prisma.pushDevice.create({data:{bindingHash:hashToken(binding),accountId,scopeBusinessId:businessId,enrollmentUntil:new Date(Date.now()+864e5)}});
  setPushCookie(response,binding);
}
export async function pushIdentity(req: NextRequest) {
  const binding = req.cookies.get(PUSH_COOKIE)?.value;
  const device = binding && /^[a-f0-9]{64}$/.test(binding) ? await prisma.pushDevice.findUnique({where:{bindingHash:hashToken(binding)}}) : null;
  const user = await getCurrentUser(req);
  if (user) return {accountId:user.id,user,device,binding:device ? binding! : randomBytes(32).toString('hex'),sessionHash:hashToken(req.cookies.get(SESSION_COOKIE)!.value)};
  if (device?.enrollmentUntil && device.enrollmentUntil > new Date()) return {accountId:device.accountId,user:null,device,binding:binding!,sessionHash:null};
  throw new ApiError(401,'Sign in to manage notifications');
}
