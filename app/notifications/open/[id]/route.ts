import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { notificationLink, safeNotificationPath } from '@/lib/notification-content';
export async function GET(req:NextRequest,ctx:{params:Promise<{id:string}>}) {
  const {id} = await ctx.params;
  const user = await getCurrentUser(req);
  let path: string;
  if (!user) path = `/login?next=${encodeURIComponent(notificationLink(id))}`;
  else {
    const notification = await prisma.notification.findFirst({where:{id,accountId:user.id}});
    if (notification) await prisma.notification.updateMany({where:{id,accountId:user.id,readAt:null},data:{readAt:new Date()}});
    path = notification ? safeNotificationPath(notification.path) : user.role === 'ADMIN' ? '/admin':'/dashboard';
  }
  return NextResponse.redirect(new URL(path,req.url),{headers:{'Cache-Control':'no-store'}});
}
