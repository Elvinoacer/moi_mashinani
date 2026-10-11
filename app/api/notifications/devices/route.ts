import { firebaseMessaging } from '@/lib/firebase-admin';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ApiError, apiError, assertSameOrigin, jsonBody, textField } from '@/lib/api';
import { pushIdentity, setPushCookie } from '@/lib/push-device';
import { hashToken } from '@/lib/auth';
import { rateLimit } from '@/lib/rate-limit';

export async function GET(req:NextRequest) {
  try {
    const identity = await pushIdentity(req);
    const d = identity.device?.accountId === identity.accountId ? identity.device : null;
    return NextResponse.json({eligible:true,authenticated:!!identity.user,declined:d?.declined || false,subscribed:!!d?.enabled && !!d?.token,role:identity.user?.role || 'BUSINESS',accountId:identity.accountId},{headers:{'Cache-Control':'no-store'}});
  } catch (error) { return apiError(error); }
}
export async function POST(req:NextRequest) {
  try {
    assertSameOrigin(req);await rateLimit(req,'push-registration',30);
    const identity = await pushIdentity(req);
    const body = await jsonBody(req);
    const action = textField(body.action,'Action',30,true);
    if (!['register','decline','disable'].includes(action)) throw new ApiError(400,'Unknown notification action');
    const token = action === 'register' ? textField(body.token,'Notification token',4096,true) : null;
    if (token && !/^[A-Za-z0-9_:.-]{20,4096}$/.test(token)) throw new ApiError(400,'Invalid notification token');
    if (action === 'register' && (!process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID !== process.env.FIREBASE_PROJECT_ID)) throw new ApiError(503,'Firebase notifications are not configured');
    if (token && token !== identity.device?.token) {
      try {await firebaseMessaging().send({token,data:{validation:'registration'}},true);}
      catch {throw new ApiError(400,'Firebase could not validate this device. Check notification setup or try again.');}
    }
    await prisma.$transaction(async tx => {
      if (token) {
        // A new signed-in account takes ownership only of this browser's presented token.
        // Queued deliveries for the previous account are invalidated by account checks.
        await tx.pushDevice.updateMany({where:{token,bindingHash:{not:hashToken(identity.binding)}},data:{token:null,enabled:false}});
      }
      const data = {scopeBusinessId:identity.user ? null : identity.device?.scopeBusinessId,accountId:identity.accountId,sessionHash:identity.sessionHash,token,enabled:action === 'register',declined:action === 'decline',lastSeenAt:new Date(),enrollmentUntil:identity.user ? null : identity.device?.enrollmentUntil};
      await tx.pushDevice.upsert({where:{bindingHash:hashToken(identity.binding)},create:{bindingHash:hashToken(identity.binding),...data},update:data});
    });
    const response = NextResponse.json({success:true});setPushCookie(response,identity.binding);return response;
  } catch (error) { return apiError(error); }
}
