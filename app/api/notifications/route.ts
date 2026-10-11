import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/auth';
import { apiError, assertSameOrigin, jsonBody, textField } from '@/lib/api';
export async function GET(req:NextRequest) {
  try {
    const user = await requireUser(req);
    const [notifications,unread] = await Promise.all([prisma.notification.findMany({where:{accountId:user.id},orderBy:{createdAt:'desc'},take:50,select:{id:true,title:true,body:true,kind:true,createdAt:true,readAt:true}}),prisma.notification.count({where:{accountId:user.id,readAt:null}})]);
    return NextResponse.json({notifications,unread},{headers:{'Cache-Control':'no-store'}});
  } catch (error) {return apiError(error);}
}
export async function PATCH(req:NextRequest) {
  try {
    assertSameOrigin(req);const user = await requireUser(req);const body = await jsonBody(req);
    const id = textField(body.id,'Notification ID',100);
    await prisma.notification.updateMany({where:{accountId:user.id,readAt:null,...(id ? {id}:{})},data:{readAt:new Date()}});
    return NextResponse.json({success:true});
  } catch (error) {return apiError(error);}
}
