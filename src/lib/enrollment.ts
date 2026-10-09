import { prisma } from './prisma';
import { Store } from './store';
import { businessInput } from './business-input';
import { normalizeEmail } from './auth';
import { ApiError, textField } from './api';
import { inviteAccount } from './invitations';
import { productLimitError } from './catalog-plan';
import { attachMedia, mediaReferences } from './media-storage';

export async function enrollBusiness(body: Record<string, unknown>, admin = false, uploaderId?: string) {
  const fields = businessInput(body);
  const limitError = productLimitError({}, [], fields.services || []);
  if (limitError) throw new ApiError(409, limitError);
  const ownerEmail = normalizeEmail(body.ownerEmail);
  const ownerName = textField(body.ownerName, 'Owner name', 120, true);
  const business = await prisma.$transaction(async tx => {
    const owner = await tx.account.upsert({where:{email:ownerEmail},create:{email:ownerEmail,name:ownerName,role:'BUSINESS'},update:{}});
    if (owner.role === 'ADMIN') throw new ApiError(400, 'Use the business owner’s email, separate from the administrator account');
    const created = await Store.createBusiness({...fields,ownerId:owner.id,ownerEmail,ownerName,ownerPhone:fields.phone,status:admin ? 'ACTIVE':'PENDING',verificationLevel:admin ? 'L2':'L0',isClaimed:false,activeTier:'NONE'}, tx);
    await attachMedia(tx, created.id, [], mediaReferences(created), uploaderId);
    return created;
  });
  const invitation = await inviteAccount(business.ownerId!, business.id);
  return {business: await Store.getBusinessById(business.id),invitation};
}
