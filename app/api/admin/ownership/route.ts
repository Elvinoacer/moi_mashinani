import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, normalizeEmail } from '@/lib/auth';
import { ApiError, apiError, assertSameOrigin, jsonBody, textField } from '@/lib/api';
import { prisma } from '@/lib/prisma';
import { inviteAccount } from '@/lib/invitations';
import { withNotificationDelivery } from '@/lib/notification-response';

export async function POST(req: NextRequest) {
  try {
    assertSameOrigin(req);
    const admin = await requireAdmin(req);
    const body = await jsonBody(req);
    const businessId = textField(body.businessId,'Business ID',100,true);
    const email = normalizeEmail(body.ownerEmail);
    const name = textField(body.ownerName,'Owner name',100,true);
    const business = await prisma.$transaction(async tx => {
      await tx.$queryRaw`SELECT "id" FROM "Business" WHERE "id" = ${businessId} FOR UPDATE`;
      const old = await tx.business.findUnique({where:{id:businessId}});
      if (!old) throw new ApiError(404,'Business not found');
      const account = await tx.account.upsert({where:{email},create:{email,name,role:'BUSINESS'},update:{}});
      if (account.role === 'ADMIN') throw new ApiError(400,'An administrator cannot be assigned as a business owner');
      await tx.verificationToken.updateMany({where:{businessId,usedAt:null},data:{usedAt:new Date()}});
      const updated = await tx.business.update({where:{id:businessId},data:{ownerId:account.id,ownerEmail:email,ownerName:name,isClaimed:false,invitationSentAt:null,invitationError:null}});
      await tx.businessAudit.create({data:{businessId,actorId:admin.id,action:'OWNER_REASSIGNED',details:`Changed from ${old.ownerEmail || 'unassigned'} to ${email}`}});
      return updated;
    });
    const invitation = await inviteAccount(business.ownerId!,businessId);
    return withNotificationDelivery(NextResponse.json({success:true,invitation}));
  } catch(error) { return apiError(error); }
}
