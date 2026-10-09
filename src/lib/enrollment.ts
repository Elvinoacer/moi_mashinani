import { prisma } from './prisma';
import { Store } from './store';
import { businessInput } from './business-input';
import { normalizeEmail } from './auth';
import { ApiError, textField } from './api';
import { inviteAccount } from './invitations';

export async function enrollBusiness(body: Record<string, unknown>, admin = false) {
  const fields = businessInput(body);
  const ownerEmail = normalizeEmail(body.ownerEmail);
  const ownerName = textField(body.ownerName, 'Owner name', 120, true);
  const business = await prisma.$transaction(async tx => {
    const owner = await tx.account.upsert({where:{email:ownerEmail},create:{email:ownerEmail,name:ownerName,role:'BUSINESS'},update:{}});
    if (owner.role === 'ADMIN') throw new ApiError(400, 'Use the business owner’s email, separate from the administrator account');
    return Store.createBusiness({...fields,ownerId:owner.id,ownerEmail,ownerName,ownerPhone:fields.phone,status:admin ? 'ACTIVE':'PENDING',verificationLevel:admin ? 'L2':'L0',isClaimed:false,activeTier:'NONE'}, tx);
  });
  const invitation = await inviteAccount(business.ownerId!, business.id);
  return {business: await Store.getBusinessById(business.id),invitation};
}
