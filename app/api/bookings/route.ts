import { NextRequest, NextResponse } from 'next/server';
import { Store, mapPrismaBooking } from '@/lib/store';
import { prisma } from '@/lib/prisma';
import { requireUser, requireBusinessAccess } from '@/lib/auth';
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
    if (!['General inquiry','General Inquiry'].includes(serviceName) && !business.services.some(s => s.name === serviceName)) throw new ApiError(400,'Choose a service offered by this business');
    const day = textField(body.day,'Day',10,true);
    const today = new Intl.DateTimeFormat('en-CA',{timeZone:'Africa/Nairobi',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
    const parsedDay = new Date(`${day}T00:00:00Z`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(day) || !Number.isFinite(parsedDay.getTime()) || parsedDay.toISOString().slice(0,10) !== day || day < today) throw new ApiError(400,'Choose a valid date today or later');
    const created = await Store.createBookingIntent({businessId:business.id,serviceName,studentName:textField(body.studentName,'Your name',120,true),contactPhone:phoneField(body.contactPhone),day,time:textField(body.time,'Time',80,true),note:textField(body.note,'Note',1000)});
    return NextResponse.json(created,{status:201});
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
    return NextResponse.json(mapPrismaBooking(await prisma.bookingIntent.update({where:{id:booking.id},data:{status}})));
  } catch(error) { return apiError(error); }
}
