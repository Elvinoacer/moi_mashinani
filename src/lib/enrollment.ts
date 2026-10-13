import { prisma } from './prisma';
import { Store } from './store';
import { businessInput } from './business-input';
import { normalizeEmail } from './auth';
import { ApiError, textField } from './api';
import { inviteAccount } from './invitations';
import { productLimitError } from './catalog-plan';
import { attachMedia, hostedMediaUrl, mediaReferences } from './media-storage';
import { phoneField } from './business-input';

export async function enrollBusiness(body: Record<string, unknown>, admin = false, uploaderId?: string) {
  const fields = businessInput(body);
  if (!fields.description || fields.description.length < 20) throw new ApiError(400, 'Describe the business in at least 20 characters');
  if (!fields.serviceModes?.length) throw new ApiError(400, 'Choose at least one service mode');
  if (admin && (body.fieldVisitConfirmed !== true || body.ownerConsentConfirmed !== true)) throw new ApiError(400, 'Confirm your shop visit and the owner’s permission before publishing a verified listing');
  const urls = mediaReferences({photos:fields.photos || [],coverPhoto:fields.coverPhoto || '',services:fields.services || []});
  if (urls.some(url => !hostedMediaUrl(url))) throw new ApiError(400, 'Use images uploaded through MoiMashinani');
  const limitError = productLimitError({}, [], fields.services || []);
  if (limitError) throw new ApiError(409, limitError);
  const ownerEmail = normalizeEmail(body.ownerEmail);
  const ownerName = textField(body.ownerName, 'Owner name', 120, true);
  const business = await prisma.$transaction(async tx => {
    const fingerprint = [fields.name?.trim().toLowerCase(),fields.zone].join('|');
    await tx.$queryRaw`SELECT 1 AS locked FROM (SELECT pg_advisory_xact_lock(hashtext(${fingerprint}))) AS lock`;
    const nearby = await tx.business.findMany({where:{zone:fields.zone,OR:[{phone:fields.phone},{ownerEmail}]},select:{name:true,phone:true,ownerEmail:true}});
    if (nearby.some(item => item.name.trim().toLowerCase() === fields.name?.trim().toLowerCase() && (item.phone === fields.phone || item.ownerEmail === ownerEmail))) throw new ApiError(409, 'This business appears to be listed already. Open the existing listing instead of submitting again.');
    const owner = await tx.account.upsert({where:{email:ownerEmail},create:{email:ownerEmail,name:ownerName,role:'BUSINESS'},update:{}});
    if (owner.role === 'ADMIN') throw new ApiError(400, 'Use the business owner’s email, separate from the administrator account');
    const created = await Store.createBusiness({...fields,ownerId:owner.id,ownerEmail,ownerName,ownerPhone:body.ownerPhone ? phoneField(body.ownerPhone) : fields.phone,status:admin ? 'ACTIVE':'PENDING',verificationLevel:admin ? 'L2':'L0',isClaimed:false,activeTier:'NONE'}, tx);
    await attachMedia(tx, created.id, [], mediaReferences(created), uploaderId);
    await tx.businessAudit.create({data:{businessId:created.id,actorId:admin ? uploaderId || null : null,action:admin ? 'FIELD_ENROLLED':'SELF_ENROLLED',details:admin ? 'Field visit and owner consent confirmed' : 'Awaiting owner acceptance'}});
    return created;
  });
  const invitation = await inviteAccount(business.ownerId!, business.id);
  return {business: await Store.getBusinessById(business.id),invitation};
}
