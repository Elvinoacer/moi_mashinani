import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { notificationLink, safeNotificationPath } from '@/lib/notification-content';
export async function GET(req:NextRequest,ctx:{params:Promise<{id:string}>}) {
  const {id} = await ctx.params;
  const user = await getCurrentUser(req);
  let path: string;
  // Token possession is still required at the action page; never disclose a capability from a public notification ID.
  if (!user) {
    const publicNotice = await prisma.notification.findFirst({
      where: {
        id,
        kind: { in: ['DEAL', 'RESTOCK_ALERT', 'REQUEST_REPLY'] },
      },
    });
    if (
      publicNotice &&
      /^\/(b|deals|search|requests|market)(\/|$|\?)/.test(publicNotice.path)
    ) {
      path = safeNotificationPath(publicNotice.path);
    } else {
      path = `/login?next=${encodeURIComponent(notificationLink(id))}`;
    }
  } else {
    const notification = await prisma.notification.findFirst({where:{id,accountId:user.id}});
    if (notification) await prisma.notification.updateMany({where:{id,accountId:user.id,readAt:null},data:{readAt:new Date()}});
    path = notification ? safeNotificationPath(notification.path) : user.role === 'ADMIN' ? '/admin':'/dashboard';
  }
  return NextResponse.redirect(new URL(path,req.url),{headers:{'Cache-Control':'no-store'}});
}
