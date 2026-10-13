import assert from 'node:assert/strict';
import { randomUUID, randomBytes } from 'node:crypto';
import { enrollmentMediaHash } from '../src/lib/enrollment-media';
import { prisma } from '../src/lib/prisma';
import { enrollBusiness } from '../src/lib/enrollment';
import { ApiError } from '../src/lib/api';

const tag = randomUUID().slice(0,8);
const email = `integrity-${tag}@test.invalid`;
const draft = {
  ownerEmail:email,ownerName:'Integrity Test Owner',
  name:`Integrity Shop ${tag}`,
  description:'A legitimate campus repair business with verified contact details.',
  primaryCategory:'phone-laptop-repair',zone:'kesses-centre',
  landmark:'Opposite campus gate',phone:'0712345678',
  serviceModes:['at_shop'],hours:{Monday:{open:'08:00',close:'18:00'}},
  services:[{id:'repair',name:'Repair',priceFrom:100}],
};
const createdIds:string[]=[];
const cookie=randomBytes(32).toString('hex');
async function main() {
try {
  const pending=await enrollBusiness(draft);
  createdIds.push(pending.business!.id);
  assert.equal(pending.business?.status,'PENDING');
  assert.equal(pending.business?.isClaimed,false);
  await assert.rejects(()=>enrollBusiness(draft),error=>error instanceof ApiError && error.status===409);
  console.log('PASS public business deduplication and unclaimed creation');
  await assert.rejects(()=>enrollBusiness({...draft,name:`Field Shop ${tag}`},true),error=>error instanceof ApiError && error.status===400);
  const field=await enrollBusiness({...draft,name:`Field Shop ${tag}`,fieldVisitConfirmed:true,ownerConsentConfirmed:true},true);
  createdIds.push(field.business!.id);
  assert.equal(field.business?.status,'ACTIVE');
  assert.equal(field.business?.verificationLevel,'L2');
  const audits=await prisma.businessAudit.findMany({where:{businessId:{in:createdIds}}});
  assert.ok(audits.some(event=>event.action==='SELF_ENROLLED') && audits.some(event=>event.action==='FIELD_ENROLLED'));
  console.log('PASS admin field verification requires consent and writes an audit event');
  // A staged photo may only be attached by the browser session that uploaded it.
  const outsider=randomBytes(32).toString('hex');
  const hash=enrollmentMediaHash(cookie)!;
  const url='/api/uploads/'+randomUUID();
  const mediaId=randomUUID();
  await prisma.enrollmentMedia.create({data:{id:mediaId,sessionHash:hash,url,bytes:15000}});
  const listing={...draft,name:`Photo Shop ${tag}`,landmark:'',mapPin:{lat:0.2825,lng:35.2912},photos:[url],coverPhoto:url};
  await assert.rejects(()=>enrollBusiness(listing,false,undefined,outsider),error=>error instanceof ApiError && error.status===403);
  assert.equal(await prisma.businessMedia.count({where:{url}}),0,'wrong session must never claim a photo');
  const photographed=await enrollBusiness(listing,false,undefined,cookie);
  createdIds.push(photographed.business!.id);
  assert.equal(photographed.business!.landmark,'Location shown on map');
  assert.equal(photographed.business!.photos[0],url);
  assert.equal((await prisma.businessMedia.findUnique({where:{url}}))?.businessId,photographed.business!.id);
  assert.equal(await prisma.enrollmentMedia.count({where:{id:mediaId}}),0);
  console.log('PASS staging sessions prevent image hijacking; map pin substitutes for landmark');
  console.log('Onboarding database integrity tests passed.');
} finally {
  await prisma.businessMedia.deleteMany({where:{businessId:{in:createdIds}}});
  await prisma.business.deleteMany({where:{id:{in:createdIds}}});
  await prisma.businessAudit.deleteMany({where:{businessId:{in:createdIds}}});
  await prisma.enrollmentMedia.deleteMany({where:{sessionHash:enrollmentMediaHash(cookie) || ''}});
  await prisma.account.deleteMany({where:{email}});
  await prisma.$disconnect();
}

}
main().catch(error=>{console.error(error);process.exitCode=1;});
