import { prisma } from './prisma';
import type { Prisma } from '@/generated/prisma/client';
import { applicationUrl, sendNotificationEmail } from './mail';
import { firebaseMessaging } from './firebase-admin';
import { notificationLink, safeNotificationPath, type NoticeContent } from './notification-content';

export async function queueNotice(tx: Prisma.TransactionClient, accountId: string | null | undefined, eventKey: string, content: NoticeContent, channels: ('EMAIL' | 'PUSH')[] = ['EMAIL','PUSH'], scopeBusinessId?: string) {
  if (!accountId) return;
  const account = await tx.account.findUnique({where:{id:accountId}});
  if (!account) return;
  const notice = await tx.notification.upsert({where:{accountId_eventKey:{accountId,eventKey}},create:{accountId,eventKey,...content,path:safeNotificationPath(content.path)},update:{}});
  const targets: {channel:string;target:string;deviceId?:string}[] = [];
  if (channels.includes('EMAIL')) targets.push({channel:'EMAIL',target:account.email});
  if (channels.includes('PUSH')) {
    const devices = await tx.pushDevice.findMany({where:{accountId,enabled:true,declined:false,token:{not:null},OR:[{scopeBusinessId:null},...(scopeBusinessId ? [{scopeBusinessId}]:[])],lastSeenAt:{gt:new Date(Date.now()-30*864e5)}}});
    for (const device of devices) targets.push({channel:'PUSH',target:device.id,deviceId:device.id});
  }
  for (const target of targets) await tx.notificationDelivery.upsert({where:{notificationId_channel_target:{notificationId:notice.id,channel:target.channel,target:target.target}},create:{notificationId:notice.id,...target},update:{}});
}
export async function queueAdmins(tx: Prisma.TransactionClient, key: string, content: NoticeContent) {
  const admins = await tx.account.findMany({where:{role:'ADMIN',emailVerifiedAt:{not:null}},select:{id:true}});
  for (const admin of admins) await queueNotice(tx,admin.id,key,content);
}
export async function listingNotice(tx: Prisma.TransactionClient, business: {id:string;ownerId:string|null;name:string;slug:string;status:string;verificationLevel:string;moderationReason:string|null}, key: string) {
  const ready = business.status === 'ACTIVE';
  await queueNotice(tx,business.ownerId,key,{kind:'LISTING_STATUS',title:ready ? `${business.name} is approved` : `${business.name}: listing update`,body:ready ? 'Your listing is live. Sign in to upload your profile, shop and product photos, complete your catalogue and respond to customer requests.' : `Your listing is ${business.status.toLowerCase()}. ${business.moderationReason || 'Open your dashboard to review the details.'}`,path:`/dashboard/${business.slug}${ready ? '?tab=photos' : ''}`,button:ready ? 'Add photos & complete profile':'Review listing'}, ['EMAIL','PUSH'], business.id);
}

// Claims are leases: another invocation can safely continue after a crashed worker.
// Provider acceptance is recorded; it is not a promise of inbox/device delivery.
export async function deliverNotifications(limit = 20, budgetMs = 18000) {
  const started = Date.now();
  const now = new Date();
  const pending = await prisma.notificationDelivery.findMany({where:{sentAt:null,stoppedAt:null,nextAttemptAt:{lte:now},OR:[{claimedAt:null},{claimedAt:{lt:new Date(now.getTime()-5*60000)}}]},orderBy:{nextAttemptAt:'asc'},take:limit,include:{notification:{include:{account:true}},device:true}});
  const result = {accepted:0,failed:0,skipped:0};
  for (const delivery of pending) {
    if (Date.now()-started >= budgetMs) break;
    const claimedAt = new Date();
    const claimed = await prisma.notificationDelivery.updateMany({where:{id:delivery.id,sentAt:null,stoppedAt:null,OR:[{claimedAt:null},{claimedAt:{lt:new Date(claimedAt.getTime()-5*60000)}}]},data:{claimedAt,attempts:{increment:1}}});
    if (!claimed.count) continue;
    try {
      const n = delivery.notification;
      const url = `${applicationUrl()}${notificationLink(n.id)}`;
      if (delivery.channel === 'EMAIL') {
        await sendNotificationEmail(delivery.target,n.account.name,n.title,n.body,n.button,url,`notification/${delivery.id}`);
      } else {
        const device = delivery.device;
        // Resolve tokens at send time: rotation must not send to a previous user's device.
        if (!device?.enabled || device.scopeBusinessId && !n.eventKey.startsWith(`listing/${device.scopeBusinessId}/`) || device.declined || !device.token || device.accountId !== n.accountId || device.lastSeenAt.getTime() < Date.now()-30*864e5) {
          await prisma.notificationDelivery.updateMany({where:{id:delivery.id,claimedAt},data:{stoppedAt:new Date(),claimedAt:null,error:'Device no longer subscribed'}});result.skipped++;continue;
        }
        await firebaseMessaging().send({token:device.token,data:{title:n.title,body:'You have an important MoiMashinani update. Open your account to see the details.',url,id:n.id},webpush:{headers:{TTL:'86400',Urgency:'high'}}});
      }
      await prisma.notificationDelivery.updateMany({where:{id:delivery.id,claimedAt},data:{sentAt:new Date(),claimedAt:null,error:null}});
      result.accepted++;
    } catch (error) {
      const code = typeof error === 'object' && error && 'code' in error ? String(error.code) : '';
      const invalid = ['messaging/registration-token-not-registered','messaging/invalid-registration-token'].includes(code);
      if (invalid && delivery.deviceId) await prisma.pushDevice.updateMany({where:{id:delivery.deviceId,token:delivery.device?.token},data:{enabled:false,token:null}});
      const attempts = delivery.attempts+1;
      await prisma.notificationDelivery.updateMany({where:{id:delivery.id,claimedAt},data:{claimedAt:null,error:invalid ? 'Expired Firebase registration' : delivery.channel === 'EMAIL' ? 'Email provider unavailable or not configured' : 'Push provider unavailable or not configured',stoppedAt:invalid || attempts >= 10 ? new Date():null,nextAttemptAt:new Date(Date.now()+Math.min(6*3600000,60000*2**Math.min(attempts,8)))}});
      result.failed++;
    }
  }
  await prisma.pushDevice.updateMany({where:{lastSeenAt:{lt:new Date(Date.now()-90*864e5)},enabled:true},data:{enabled:false,token:null}});
  return result;
}
