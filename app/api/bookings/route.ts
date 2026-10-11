import { withNotificationDelivery } from '@/lib/notification-response';
import { queueNotice, queueAdmins } from '@/lib/notifications';
import { NextRequest, NextResponse } from 'next/server';
import { Store, mapPrismaBooking } from '@/lib/store';
import { prisma } from '@/lib/prisma';
import { getCurrentUser, requireUser, requireBusinessAccess } from '@/lib/auth';
import { visibleProducts } from '@/lib/catalog-plan';
import { apiError, ApiError, assertSameOrigin, jsonBody, textField } from '@/lib/api';
import { phoneField } from '@/lib/business-input';
import { rateLimit } from '@/lib/rate-limit';
export async function GET(req:NextRequest) {
  try {
    const user = await requireUser(req);
    const businessId = req.nextUrl.searchParams.get('businessId');
    const allowed = (await Store.getBusinesses()).filter(b => user.role === 'ADMIN' || b.ownerId === user.id);
    if (businessId && !allowed.some(b => b.id === businessId)) throw new ApiError(403,'You can only read requests for your own business');
    return NextResponse.json(await Store.getBookings(allowed.filter(b => !businessId || b.id === businessId).map(b => b.id)),{headers:{'Cache-Control':'no-store'}});
  } catch(error) { return apiError(error); }
}
export async function POST(req:NextRequest) {
  try {
    assertSameOrigin(req); await rateLimit(req,'booking',15);
    const body = await jsonBody(req);
    const business = await Store.getBusinessById(textField(body.businessId,'Business ID',100,true));
    if (!business || business.status !== 'ACTIVE') throw new ApiError(404,'Business is unavailable');
    if (business.isTemporarilyClosed) throw new ApiError(409,'This business is temporarily closed');
    const serviceName = textField(body.serviceName,'Service',150,true);
    if (!['General inquiry','General Inquiry'].includes(serviceName) && !visibleProducts(business).some(s => s.name === serviceName)) throw new ApiError(400,'Choose a service offered by this business');
    const day = textField(body.day,'Day',10,true);
    const today = new Intl.DateTimeFormat('en-CA',{timeZone:'Africa/Nairobi',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
    const parsedDay = new Date(`${day}T00:00:00Z`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(day) || !Number.isFinite(parsedDay.getTime()) || parsedDay.toISOString().slice(0,10) !== day || day < today) throw new ApiError(400,'Choose a valid date today or later');
    const created = await Store.createBookingIntent({businessId:business.id,serviceName,studentName:textField(body.studentName,'Your name',120,true),contactPhone:phoneField(body.contactPhone),day,time:textField(body.time,'Time',80,true),note:textField(body.note,'Note',1000)},(await getCurrentUser(req))?.id);
    return withNotificationDelivery(NextResponse.json(created,{status:201}));
  } catch(error) { return apiError(error); }
}
export async function PATCH(req:NextRequest) {
  try {
    assertSameOrigin(req);
    const body = await jsonBody(req);
    const booking = await prisma.bookingIntent.findUnique({where:{id:textField(body.id,'Booking ID',100,true)}});
    if (!booking) throw new ApiError(404,'Customer request not found');
    const business = await Store.getBusinessById(booking.businessId);
    if (!business) throw new ApiError(404,'Business not found');
    await requireBusinessAccess(req,business);
    const status = textField(body.status,'Status',30,true);
    if (!['NEW','CONFIRMED','COMPLETED','CANCELLED'].includes(status)) throw new ApiError(400,'Invalid request status');
    const updated = await prisma.$transaction(async tx => {
      await tx.$queryRaw`SELECT "id" FROM "BookingIntent" WHERE "id" = ${booking.id} FOR UPDATE`;
      const current = await tx.bookingIntent.findUniqueOrThrow({where:{id:booking.id}});
      if (current.status === status) return current;
      const updated = await tx.bookingIntent.update({where:{id:booking.id},data:{status}});
      const key = `booking/${booking.id}/${updated.status}/${Date.now()}`;
      const content = {kind:'BOOKING_STATUS',title:`Customer request ${status.toLowerCase()}`,body:`The request for ${updated.serviceName} with ${business.name} is now ${status.toLowerCase()}.`,path:`/dashboard/${business.slug}?tab=bookings`,button:'View customer requests'};
      await queueNotice(tx,business.ownerId,key,content);
      if (updated.requesterId && updated.requesterId !== business.ownerId) await queueNotice(tx,updated.requesterId,key,{...content,path:'/dashboard?notifications=1',button:'View my notifications'});
      await queueAdmins(tx,key,content);
      return updated;
    });
    return withNotificationDelivery(NextResponse.json(mapPrismaBooking(updated)));
  } catch(error) { return apiError(error); }
}
