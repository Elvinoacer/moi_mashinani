import 'dotenv/config';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { writeFileSync } from 'node:fs';
import { mock } from 'node:test';
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { NextRequest } from 'next/server';
import sharp from 'sharp';
import { prisma } from '../src/lib/prisma';
import { Store } from '../src/lib/store';
import { newSession } from '../src/lib/auth';
import { reserveMedia, getStorageUsage } from '../src/lib/media-storage';
import { MAX_STORED_IMAGE_BYTES, FREE_STORAGE_BYTES, nextProEnd } from '../src/lib/catalog-plan';
import { runPlanMaintenance } from '../src/lib/plan-maintenance';
import { publicBusiness } from '../src/lib/business-input';
import { POST as addProduct, PATCH as editProduct, DELETE as deleteProduct } from '../app/api/businesses/[slug]/products/route';
import { PATCH as patchBusiness } from '../app/api/businesses/[slug]/route';
import { POST as upload, DELETE as deletePhoto } from '../app/api/uploads/route';
import { POST as createCheckout } from '../app/api/payments/route';
import { GET as cron } from '../app/api/cron/catalog-plans/route';
import type { ServiceItem } from '../src/lib/types';

async function main() {
  const url=new URL(process.env.DATABASE_URL!);
  assert.ok(['127.0.0.1','localhost'].includes(url.hostname) && url.pathname.endsWith('_catalog_test'),'Only a disposable local catalog test database is allowed');
  await prisma.$executeRaw`TRUNCATE "Business", "Account", "PaymentRecord", "RequestLimit" CASCADE`;
  Object.assign(process.env,{APP_URL:'http://127.0.0.1:3101',R2_ENDPOINT:'https://r2.test.invalid',R2_BUCKET_NAME:'test',R2_PUBLIC_URL:'https://media.test.invalid',R2_KEY_PREFIX:'moimashinani',R2_ACCESS_KEY_ID:'fake',R2_SECRET_ACCESS_KEY:'fake',CRON_SECRET:'synthetic-cron-secret'});
  const writes: Array<PutObjectCommand|DeleteObjectCommand> = [];
  mock.method(S3Client.prototype,'send',async(command:PutObjectCommand|DeleteObjectCommand)=>{writes.push(command);return {};});
  const owner=await prisma.account.create({data:{email:`catalog-${randomUUID()}@test.invalid`,name:'Catalog Owner',emailVerifiedAt:new Date()}});
  const other=await prisma.account.create({data:{email:`other-${randomUUID()}@test.invalid`,name:'Other Owner',emailVerifiedAt:new Date()}});
  const token=await newSession(owner.id);const otherToken=await newSession(other.id);
  const business=await Store.createBusiness({name:`Catalog Test ${randomUUID().slice(0,6)}`,primaryCategory:'food-cafes',ownerId:owner.id,status:'ACTIVE',phone:'+254712345678',description:'Synthetic catalogue verification',zone:'kesses-centre'});
  const props={params:Promise.resolve({slug:business.slug})};
  function request(method:string,body:unknown,signedToken=token){return new NextRequest(`http://127.0.0.1:3101/api/businesses/${business.slug}/products`,{method,headers:{Cookie:`mm_session=${signedToken}`,Origin:process.env.APP_URL!,'Content-Type':'application/json'},body:JSON.stringify(body)});}
  const products:ServiceItem[]=Array.from({length:5},(_,i)=>({id:`product-${i}`,name:`Product ${i+1}`,priceFrom:100+i}));
  for(const item of products)assert.equal((await addProduct(request('POST',item),props)).status,200);
  assert.equal((await addProduct(request('POST',{id:'sixth',name:'Sixth item'}),props)).status,409);
  assert.equal((await patchBusiness(request('PATCH',{services:[...products,{id:'bypass',name:'Bypass'}]}),props)).status,409);
  assert.equal((await patchBusiness(request('PATCH',{proEndsAt:'2099-01-01'}),props)).status,400);
  assert.equal((await addProduct(request('POST',{id:'spoof',name:'Spoof'},otherToken),props)).status,403);
  // Two simultaneous attempts to fill the final free slot cannot both succeed.
  await deleteProduct(request('DELETE',{id:'product-4'}),props);
  const attempts=await Promise.all(['racing-a','racing-b'].map(id=>addProduct(request('POST',{id,name:id}),props)));
  assert.deepEqual(attempts.map(response=>response.status).sort(),[200,409]);
  assert.equal((await Store.getBusinessById(business.id))!.services.length,5);
  console.log('PASS Free product cap, forged plan rejection, ownership and concurrent writes');

  const oldFetch=globalThis.fetch;
  const originalPaymentEnv={APP_URL:process.env.APP_URL,INTASEND_MODE:process.env.INTASEND_MODE,INTASEND_PUBLIC_KEY:process.env.INTASEND_PUBLIC_KEY,INTASEND_SECRET_KEY:process.env.INTASEND_SECRET_KEY,INTASEND_WEBHOOK_CHALLENGE:process.env.INTASEND_WEBHOOK_CHALLENGE};
  Object.assign(process.env,{APP_URL:'https://app.test.invalid',INTASEND_MODE:'sandbox',INTASEND_PUBLIC_KEY:'ISPubKey_test_fake',INTASEND_SECRET_KEY:'ISSecretKey_test_fake',INTASEND_WEBHOOK_CHALLENGE:'fake-challenge'});
  let checkoutCalls=0;
  globalThis.fetch=async(input,init)=>{
    assert.equal(String(input),'https://sandbox.intasend.com/api/v1/checkout/');checkoutCalls++;
    const body=JSON.parse(String(init?.body));assert.equal(body.amount,500);assert.equal(body.currency,'KES');assert.match(body.redirect_url,/\/pro\//);
    return Response.json({id:'synthetic-checkout',url:'https://sandbox.intasend.com/checkout/synthetic-checkout/express/',signature:'mock-signature',amount:500,currency:'KES'});
  };
  const checkoutBody={businessId:business.id,planId:'PRO',weeks:1,phone:'0712345678',amountKes:1};
  const checkoutResponse=await createCheckout(request('POST',checkoutBody));assert.equal(checkoutResponse.status,200);
  const grant=(await checkoutResponse.json()).payment;assert.equal(grant.amountKes,500);
  assert.equal((await createCheckout(request('POST',checkoutBody))).status,200);assert.equal(checkoutCalls,1,'Retry reuses the hosted checkout');
  assert.equal((await createCheckout(request('POST',{...checkoutBody,weeks:4}))).status,400);
  assert.equal((await createCheckout(request('POST',checkoutBody,otherToken))).status,403);
  globalThis.fetch=oldFetch;
  for(const [key,value] of Object.entries(originalPaymentEnv)){if(value===undefined)delete process.env[key];else process.env[key]=value;}
  console.log('PASS server-priced Pro checkout, correct return URL, duration restriction, auth and hosted checkout reuse');
  const promotionEnd=new Date(Date.now()+10*864e5);
  await prisma.business.update({where:{id:business.id},data:{activeTier:'FEATURED',tierEndsAt:promotionEnd}});
  await Promise.all([1,2,3].map(()=>Store.confirmVerifiedPayment(grant.id,{invoiceId:`pro-${grant.id}`,state:'COMPLETE'})));
  let upgraded=await Store.getBusinessById(business.id);
  assert.ok(upgraded!.proEndsAt);const firstEnd=upgraded!.proEndsAt!;
  assert.equal(upgraded!.activeTier,'FEATURED');assert.equal(upgraded!.tierEndsAt,promotionEnd.toISOString());
  assert.equal((await addProduct(request('POST',{id:'sixth',name:'Sixth item'}),props)).status,200);
  const renewal=await Store.createPayment({businessId:business.id,planId:'PRO',weeks:1,amountKes:500,phone:'254712345678',method:'INTASEND_CHECKOUT',provider:'INTASEND',currency:'KES'});
  await Store.confirmVerifiedPayment(renewal.id,{invoiceId:`pro-${renewal.id}`,state:'COMPLETE'});
  upgraded=await Store.getBusinessById(business.id);
  assert.equal(upgraded!.proEndsAt,nextProEnd(firstEnd).toISOString());
  const bad=await Store.createPayment({businessId:business.id,planId:'PRO',weeks:1,amountKes:499,phone:'254712345678',method:'INTASEND_CHECKOUT',provider:'INTASEND',currency:'KES'});
  await assert.rejects(Store.confirmVerifiedPayment(bad.id,{invoiceId:`bad-${bad.id}`,state:'COMPLETE'}),/Invalid Pro payment/);
  await Store.updatePayment(bad.id,{state:'FAILED'});
  console.log('PASS verified KES 500 activation, callback replay protection, calendar-month renewal and independent promotions');

  await prisma.business.update({where:{id:business.id},data:{proEndsAt:new Date(Date.now()-1000)}});
  const expired=(await Store.getBusinessById(business.id))!;
  assert.equal(expired.services.length,6);assert.equal(publicBusiness(expired).services.length,5);
  assert.equal((await addProduct(request('POST',{id:'seventh',name:'Seventh'}),props)).status,409);
  assert.equal((await editProduct(request('PATCH',{...expired.services[5],name:'Edited hidden item',publishFirst:true}),props)).status,200);
  assert.equal((await Store.getBusinessById(business.id))!.services[0].name,'Edited hidden item');
  console.log('PASS instant expiry, retained hidden items, edits and choosing the public five');

  // Count reservations before R2 writes and serialize against the same business.
  await prisma.businessMedia.create({data:{accountId:owner.id,businessId:business.id,bytes:10*1024*1024,state:'READY'}});
  const reservations=await Promise.allSettled([reserveMedia(owner.id,business.id,Array(8).fill(MAX_STORED_IMAGE_BYTES)),reserveMedia(owner.id,business.id,Array(8).fill(MAX_STORED_IMAGE_BYTES))]);
  assert.equal(reservations.filter(result=>result.status==='fulfilled').length,1);
  assert.equal((await getStorageUsage(business.id)).usedBytes,18*1024*1024);
  await prisma.businessMedia.deleteMany({where:{businessId:business.id}});
  const png=await sharp({create:{width:1800,height:200,channels:3,background:'#335e41'}}).png().toBuffer();
  function uploadRequest(businessId:string){const form=new FormData();form.append('businessId',businessId);form.append('files',new Blob([new Uint8Array(png)],{type:'image/png'}),'test.png');return new NextRequest('http://127.0.0.1:3101/api/uploads',{method:'POST',headers:{Cookie:`mm_session=${token}`,Origin:process.env.APP_URL!},body:form});}
  const uploaded=await upload(uploadRequest(business.id));assert.equal(uploaded.status,201);
  const photo=(await uploaded.json()).photos[0];
  const media=await prisma.businessMedia.findUniqueOrThrow({where:{url:photo}});assert.ok(media.bytes<=MAX_STORED_IMAGE_BYTES);assert.equal(media.state,'READY');
  const written=writes.find(command=>command instanceof PutObjectCommand) as PutObjectCommand;
  const meta=await sharp(written.input.Body as Buffer).metadata();assert.equal(meta.format,'webp');assert.equal(meta.width,1600);assert.equal(meta.exif,undefined);
  const first=(await Store.getBusinessById(business.id))!.services[0];
  assert.equal((await editProduct(request('PATCH',{...first,photo}),props)).status,200);
  const deletion=new NextRequest(`http://127.0.0.1:3101/api/uploads?url=${encodeURIComponent(photo)}`,{method:'DELETE',headers:{Cookie:`mm_session=${token}`,Origin:process.env.APP_URL!}});
  assert.equal((await deletePhoto(deletion)).status,409,'Referenced photos cannot be deleted');
  assert.equal((await editProduct(request('PATCH',{...first,photo:undefined}),props)).status,200);
  assert.equal(await prisma.businessMedia.findUnique({where:{url:photo}}),null);
  assert.ok(writes.some(command=>command instanceof DeleteObjectCommand));
  await prisma.businessMedia.create({data:{accountId:owner.id,businessId:business.id,bytes:FREE_STORAGE_BYTES,state:'READY'}});
  const beforeWrites=writes.length;assert.equal((await upload(uploadRequest(business.id))).status,409);assert.equal(writes.length,beforeWrites);
  await prisma.business.update({where:{id:business.id},data:{proEndsAt:new Date(Date.now()+864e5)}});
  assert.equal((await upload(uploadRequest(business.id))).status,201,'Pro may upload above Free allocation');
  await prisma.businessMedia.deleteMany({where:{businessId:business.id}});
  console.log('PASS atomic storage reservation, upload compression, ownership, quota enforcement and safe object deletion');

  const end=new Date('2027-03-20T09:00:00Z');await prisma.business.update({where:{id:business.id},data:{proEndsAt:end}});
  const sent:number[]=[];
  const sender=async(_email:string,_name:string,_slug:string,_end:Date,stage:number)=>{sent.push(stage);};
  for(const days of [7,3,1,0]){
    const now=new Date(end.getTime()-days*864e5);const firstRun=await runPlanMaintenance(now,sender);assert.equal(firstRun.sent,1);
    const retry=await runPlanMaintenance(now,sender);assert.equal(retry.sent,0);
  }
  assert.deepEqual(sent,[7,3,1,0]);
  await prisma.business.update({where:{id:business.id},data:{proEndsAt:new Date('2027-04-20T09:00:00Z')}});
  assert.equal((await runPlanMaintenance(new Date('2027-03-20T09:00:00Z'),sender)).sent,0,'Renewed owners must not receive old expiry reminders');
  const failed=await runPlanMaintenance(new Date('2027-04-13T09:00:00Z'),async()=>{throw new Error('Mock provider outage');});assert.equal(failed.failed,1);
  assert.equal((await runPlanMaintenance(new Date('2027-04-13T09:00:00Z'),sender)).sent,1,'Failed notices remain retryable');
  assert.equal((await cron(new NextRequest('http://127.0.0.1:3101/api/cron/catalog-plans'))).status,401);
  console.log('PASS 7/3/1-day and expiry notices, persistent deduplication, provider retry, renewal suppression and cron authentication');

  // Fixtures remain only in this disposable local database for browser verification.
  const free=await Store.createBusiness({name:'Free Catalogue Test',ownerId:owner.id,status:'ACTIVE',primaryCategory:'food-cafes',phone:'+254712345678',zone:'kesses-centre',services:products});
  const pro=await Store.createBusiness({name:'Pro Catalogue Test',ownerId:owner.id,status:'ACTIVE',primaryCategory:'food-cafes',phone:'+254712345678',zone:'kesses-centre',services:Array.from({length:35},(_,i)=>({id:`large-${i}`,name:`Pro Product ${i+1}`,priceFrom:150}))});
  await prisma.business.update({where:{id:pro.id},data:{proEndsAt:new Date(Date.now()+3*864e5)}});
  await prisma.business.update({where:{id:business.id},data:{proEndsAt:new Date(Date.now()-864e5)}});
  const admin=await prisma.account.create({data:{email:`upload-admin-${randomUUID()}@test.invalid`,name:'Upload Test Admin',role:'ADMIN',emailVerifiedAt:new Date()}});
  const adminToken=await newSession(admin.id);
  writeFileSync('/tmp/moimashinani-catalog-context.json',JSON.stringify({token,adminToken,freeSlug:free.slug,proSlug:pro.slug,expiredSlug:business.slug,businessId:business.id}),{mode:0o600});
}
main().catch(error=>{console.error(error);process.exitCode=1;}).finally(async()=>{mock.restoreAll();await prisma.$disconnect();});
