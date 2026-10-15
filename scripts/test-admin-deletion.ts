import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { chromium } from '@playwright/test';
import type { Prisma } from '../src/generated/prisma/client';

const context = JSON.parse(readFileSync('/tmp/moimashinani-test-context.json','utf8'));
process.env.DATABASE_URL = context.databaseUrl;
process.env.DATABASE_IP_FAMILY = '';
async function main() {
const { prisma } = await import('../src/lib/prisma');
const base = context.baseUrl;
const tag = randomUUID();
let browser: Awaited<ReturnType<typeof chromium.launch>> | undefined;
async function call(body: unknown, cookie = '', expected = 200, origin = base) {
  const response = await fetch(`${base}/api/admin/actions`,{method:'POST',headers:{Origin:origin,'Content-Type':'application/json',Cookie:cookie},body:JSON.stringify(body)});
  assert.equal(response.status,expected,await response.text());
}
try {
  const admin = await prisma.account.findUniqueOrThrow({where:{email:context.admin.email}});
  const owner = await prisma.account.create({data:{email:`delete-${tag}@test.invalid`,name:'Deletion Owner',role:'BUSINESS',emailVerifiedAt:new Date(),passwordHash:admin.passwordHash}});
  const template = await prisma.business.findFirstOrThrow();
  const business = await prisma.business.create({data:{...template,id:`delete-${tag}`,slug:`delete-${tag}`,name:`Delete Test ${tag}`,ownerId:owner.id,ownerEmail:owner.email,photos:[],coverPhoto:'',services:[],claimCode:null,mapPin:undefined,utilities:template.utilities as Prisma.InputJsonValue,hours:template.hours as Prisma.InputJsonValue,metrics:template.metrics as Prisma.InputJsonValue}});
  const login = async (email:string) => {
    const response = await fetch(`${base}/api/auth/login`,{method:'POST',headers:{Origin:base,'Content-Type':'application/json'},body:JSON.stringify({email,password:context.admin.password})});
    assert.equal(response.status,200);
    return response.headers.get('set-cookie')!.split(';')[0];
  };
  const adminCookie = await login(admin.email);
  const ownerCookie = await login(owner.email);
  const action = {action:'delete_listing',targetId:business.id,confirmationName:business.name};
  await call(action,'',401);
  await call(action,ownerCookie,403);
  await call(action,adminCookie,403,'https://untrusted.test');
  await call({...action,confirmationName:'Wrong name'},adminCookie,409);
  await call({action:'delete_listing',targetId:business.id},adminCookie,400);
  assert.ok(await prisma.business.findUnique({where:{id:business.id}}));
  console.log('PASS admin authorization, origin and confirmation protection');
  const payment = await prisma.paymentRecord.create({data:{id:`payment-${tag}`,apiRef:tag,businessId:business.id,businessName:business.name,planId:'PRO',phone:'0712345678',state:'PENDING'}});
  await call(action,adminCookie,409);
  await prisma.paymentRecord.update({where:{id:payment.id},data:{state:'COMPLETE'}});
  console.log('PASS pending payment blocks deletion');
  const requester = await prisma.account.create({data:{email:`requester-${tag}@test.invalid`,name:'Customer',emailVerifiedAt:new Date()}});
  await prisma.bookingIntent.create({data:{id:`booking-${tag}`,businessId:business.id,requesterId:requester.id}});
  const report = await prisma.problemReport.create({data:{id:`report-${tag}`,businessId:business.id,businessName:business.name,reason:'closed'}});
  await prisma.verificationToken.create({data:{accountId:owner.id,businessId:business.id,tokenHash:tag,expiresAt:new Date(Date.now()+3600000)}});
  await prisma.pushDevice.create({data:{accountId:owner.id,bindingHash:tag,scopeBusinessId:business.id,enabled:true}});
  const photo = await prisma.uploadedPhoto.create({data:{accountId:owner.id,content:Buffer.from('test')}});
  const photoUrl = `/api/uploads/${photo.id}`;
  await prisma.businessMedia.create({data:{accountId:owner.id,businessId:business.id,url:photoUrl,bytes:4,state:'READY'}});
  await prisma.business.update({where:{id:business.id},data:{photos:[photoUrl]}});
  browser = await chromium.launch({headless:true});
  const page = await browser.newPage({viewport:{width:390,height:844}});
  await page.context().addCookies([{name:adminCookie.split('=')[0],value:adminCookie.slice(adminCookie.indexOf('=')+1),url:base}]);
  page.setDefaultTimeout(60000);
  await page.goto(`${base}/admin?queue=listings`,{timeout:120000});
  await page.getByPlaceholder('Business name, owner email or area').fill(business.name);
  await page.getByRole('button',{name:'Delete business',exact:true}).click();
  const dialog = page.getByRole('dialog');
  await dialog.waitFor();
  assert.ok(await dialog.getByRole('button',{name:'Delete permanently',exact:true}).isDisabled());
  await dialog.getByRole('button',{name:'Cancel',exact:true}).click();
  assert.ok(await prisma.business.findUnique({where:{id:business.id}}));
  await page.getByRole('button',{name:'Delete business',exact:true}).click();
  await dialog.getByRole('textbox',{name:'Type the business name to confirm'}).fill(business.name);
  await dialog.getByRole('button',{name:'Delete permanently',exact:true}).click();
  await page.getByText('Business deleted. Owner notification queued.',{exact:true}).waitFor();
  assert.equal(await prisma.business.findUnique({where:{id:business.id}}),null);
  assert.equal(await prisma.bookingIntent.count({where:{businessId:business.id}}),0);
  assert.equal(await prisma.verificationToken.count({where:{businessId:business.id}}),0);
  assert.equal((await prisma.pushDevice.findUniqueOrThrow({where:{bindingHash:tag}})).enabled,false);
  assert.equal((await prisma.problemReport.findUniqueOrThrow({where:{id:report.id}})).status,'RESOLVED');
  assert.ok(await prisma.paymentRecord.findUnique({where:{id:payment.id}}));
  assert.ok(await prisma.account.findUnique({where:{id:owner.id}}));
  const notice = await prisma.notification.findFirstOrThrow({where:{accountId:owner.id,kind:'LISTING_DELETED'}});
  assert.equal(notice.path,'/dashboard?notifications=1');
  assert.equal(await prisma.notificationDelivery.count({where:{notificationId:notice.id,channel:'EMAIL'}}),1);
  assert.ok(await prisma.notification.findFirst({where:{accountId:admin.id,kind:'LISTING_DELETED'}}));
  assert.ok(await prisma.notification.findFirst({where:{accountId:requester.id,kind:'BOOKING_STATUS',title:'Your customer request was cancelled'}}));
  const { Store } = await import('../src/lib/store');
  await assert.rejects(Store.createBookingIntent({businessId:business.id}),{status:404});
  await assert.rejects(Store.createPayment({businessId:business.id}),{status:404});
  await call(action,adminCookie,404);
  for (let attempt=0;attempt<30 && await prisma.uploadedPhoto.findUnique({where:{id:photo.id}});attempt++) await new Promise(resolve=>setTimeout(resolve,100));
  assert.equal(await prisma.uploadedPhoto.findUnique({where:{id:photo.id}}),null);
  console.log('PASS mobile confirmation/cancel/delete, related-record cleanup, owner notice, admin record and photo cleanup');
} finally {
  await browser?.close();
  await prisma.$disconnect();
}

}
main().catch(error => {console.error(error);process.exitCode=1;});
