import assert from 'node:assert/strict';
import { test } from 'node:test';
import { nextProEnd, hasPro, productLimitError, reminderStage, visibleProducts, FREE_STORAGE_BYTES } from '../src/lib/catalog-plan';
import { sendProPlanEmail } from '../src/lib/mail';
import { prisma } from '../src/lib/prisma';
import { runPlanMaintenance } from '../src/lib/plan-maintenance';
import { GET as cron, maxDuration } from '../app/api/cron/catalog-plans/route';
import { NextRequest } from 'next/server';

const items = Array.from({length:6},(_,i)=>({id:`item-${i}`,name:`Product ${i}`}));
test('calendar month renewal clamps month ends and preserves paid time',()=>{
  assert.equal(nextProEnd(null,new Date('2027-01-31T10:00:00Z')).toISOString(),'2027-02-28T10:00:00.000Z');
  assert.equal(nextProEnd(null,new Date('2028-01-31T10:00:00Z')).toISOString(),'2028-02-29T10:00:00.000Z');
  assert.equal(nextProEnd('2027-05-15T10:00:00Z',new Date('2027-05-01')).toISOString(),'2027-06-15T10:00:00.000Z');
  assert.equal(nextProEnd('2027-04-15T10:00:00Z',new Date('2027-05-01')).toISOString(),'2027-06-01T00:00:00.000Z');
});
test('external cron rejects missing/wrong tokens and uses small resumable batches within the host timeout',async()=>{
  const oldSecret=process.env.CRON_SECRET;
  const original=prisma.$queryRaw;
  const calls:unknown[][]=[];
  prisma.$queryRaw=(async(...args:unknown[])=>{calls.push(args);return [];}) as typeof original;
  try {
    delete process.env.CRON_SECRET;
    assert.equal((await cron(new NextRequest('https://app.test.invalid/api/cron/catalog-plans'))).status,503);
    process.env.CRON_SECRET='synthetic-test-secret';
    assert.equal((await cron(new NextRequest('https://app.test.invalid/api/cron/catalog-plans',{headers:{Authorization:'Bearer incorrect'}}))).status,401);
    assert.equal(calls.length,0,'Unauthorized requests must never access maintenance data');
    const response=await cron(new NextRequest('https://app.test.invalid/api/cron/catalog-plans',{headers:{Authorization:'Bearer synthetic-test-secret'}}));
    assert.equal(response.status,200);
    assert.equal(response.headers.get('Cache-Control'),'no-store');
    assert.deepEqual(await response.json(),{sent:0,skipped:0,failed:0,cleaned:0,cleanupFailed:0});
    assert.equal(maxDuration,25);
    assert.equal(calls.length,2);
    assert.ok(calls.every(args=>args.at(-1)===10),'Both reminder and cleanup batches must be limited');
    calls.length=0;
    await runPlanMaintenance(new Date(),sendProPlanEmail,{batchSize:10,signal:AbortSignal.abort()});
    assert.equal(calls.length,1,'Canceled work must skip the cleanup query');
  } finally {
    prisma.$queryRaw=original;
    if(oldSecret===undefined)delete process.env.CRON_SECRET;else process.env.CRON_SECRET=oldSecret;
  }
});
test('expiry is immediate, extra items are retained for owners, Free cannot add a sixth item',()=>{
  const now=Date.parse('2027-03-20T09:00:00Z');const expired={proEndsAt:new Date(now).toISOString()};
  assert.equal(hasPro(expired,now),false);
  assert.equal(visibleProducts({...expired,services:items},now).length,5);
  assert.ok(productLimitError({},items.slice(0,5),items,now));
  assert.equal(productLimitError(expired,items,items.map(item=>({...item,name:'Updated'})),now),undefined);
  assert.equal(productLimitError(expired,items,items.slice(1),now),undefined);
  assert.ok(productLimitError(expired,items,[...items.slice(0,5),{id:'new',name:'New'}],now));
  assert.equal(productLimitError({proEndsAt:new Date(now+1).toISOString()},items,Array.from({length:100},(_,i)=>({id:`pro-${i}`,name:'Pro item'})),now),undefined);
  assert.ok(productLimitError({},[],[{id:'same',name:'A'},{id:'same',name:'B'}],now));
  assert.equal(FREE_STORAGE_BYTES,25*1024*1024);
});
test('missed scheduler runs select the closest useful reminder, and expiry gets its own notice',()=>{
  const end=new Date('2027-03-20T09:00:00Z');
  for(const [days,stage] of [[8,undefined],[7,7],[4,7],[3,3],[1,1],[0,0],[-1,0]])assert.equal(reminderStage(end,new Date(end.getTime()-days!*864e5)),stage);
});
test('reminder email has manual checkout, Nairobi date and stable provider idempotency key',async()=>{
  const old={APP_URL:process.env.APP_URL,RESEND_API_KEY:process.env.RESEND_API_KEY,EMAIL_FROM:process.env.EMAIL_FROM};
  Object.assign(process.env,{APP_URL:'https://app.test.invalid',RESEND_API_KEY:'fake-test-key',EMAIL_FROM:'Business <test@test.invalid>'});
  try {const fetcher:typeof fetch=async(input,init)=>{
    assert.equal(String(input),'https://api.resend.com/emails');assert.equal(new Headers(init?.headers).get('Idempotency-Key'),'notice-test');
    const body=JSON.parse(String(init?.body));assert.deepEqual(body.to,['owner@test.invalid']);assert.match(body.text,/https:\/\/app.test.invalid\/pro\/test-shop/);assert.match(body.text,/never charge you automatically/);assert.match(body.text,/East Africa Time/);assert.match(body.text,/KES 500/);return Response.json({id:'accepted'});
  };await sendProPlanEmail('owner@test.invalid','Test Shop','test-shop',new Date('2027-03-20T09:00:00Z'),7,'notice-test',fetcher);
  }finally{for(const [key,value] of Object.entries(old)){if(value===undefined)delete process.env[key];else process.env[key]=value;}}
});
