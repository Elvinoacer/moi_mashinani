import { NextRequest, NextResponse, after } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { ApiError, apiError, assertSameOrigin, jsonBody, textField } from '@/lib/api';
import { prisma } from '@/lib/prisma';
import { deliverNotifications } from '@/lib/notifications';
export async function GET(req:NextRequest) {
  try {
    await requireAdmin(req);
    const [pending,stopped,recentFailures] = await Promise.all([
      prisma.notificationDelivery.count({where:{sentAt:null,stoppedAt:null}}),
      prisma.notificationDelivery.count({where:{sentAt:null,stoppedAt:{not:null}}}),
      prisma.notificationDelivery.findMany({where:{sentAt:null,error:{not:null}},select:{id:true,channel:true,attempts:true,error:true,nextAttemptAt:true,stoppedAt:true},orderBy:{nextAttemptAt:'desc'},take:30}),
    ]);
    return NextResponse.json({pending,stopped,recentFailures},{headers:{'Cache-Control':'no-store'}});
  } catch(error) {return apiError(error);}
}
export async function POST(req:NextRequest) {
  try {
    assertSameOrigin(req);await requireAdmin(req);const body = await jsonBody(req);const id=textField(body.id,'Delivery ID',100,true);
    // Requeue an email or still-active push device; expired tokens need re-registration.
    const delivery = await prisma.notificationDelivery.findUnique({where:{id},include:{device:true}});
    if (!delivery) throw new ApiError(404,'Delivery not found');
    if (delivery.sentAt || delivery.channel === 'PUSH' && (!delivery.device?.enabled || !delivery.device.token)) throw new ApiError(409,'Delivery is already sent or the device needs re-registration');
    const queued = await prisma.notificationDelivery.updateMany({where:{id,sentAt:null,claimedAt:null},data:{stoppedAt:null,nextAttemptAt:new Date(),attempts:0,error:null}});
    if (!queued.count) throw new ApiError(409,'Delivery is currently being processed');
    after(() => deliverNotifications(10,10000).then(() => {}).catch(() => {}));
    return NextResponse.json({success:true});
  } catch(error) {return apiError(error);}
}
