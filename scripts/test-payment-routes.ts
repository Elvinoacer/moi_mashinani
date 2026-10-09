import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { NextRequest } from 'next/server';
const context = JSON.parse(readFileSync('/tmp/moimashinani-test-context.json','utf8'));
process.env.DATABASE_URL = context.databaseUrl;
Object.assign(process.env,{APP_URL:'https://payments.test.invalid',INTASEND_MODE:'sandbox',INTASEND_PUBLIC_KEY:'ISPubKey_test_mock',INTASEND_SECRET_KEY:'ISSecretKey_test_mock',INTASEND_WEBHOOK_CHALLENGE:'route-test-challenge'});
async function main() {
  const {prisma} = await import('../src/lib/prisma');
  const {Store} = await import('../src/lib/store');
  const {newSession} = await import('../src/lib/auth');
  const checkoutRoute = await import('../app/api/payments/route');
  const webhookRoute = await import('../app/api/payments/webhook/route');
  const retryRoute = await import('../app/api/payments/[id]/retry/route');
  const verifyRoute = await import('../app/api/payments/[id]/verify/route');
  const admin = await prisma.account.findUniqueOrThrow({where:{email:context.admin.email}});
  const cookie = `mm_session=${await newSession(admin.id)}`;
  const business = await Store.createBusiness({name:'Payment Route Test',phone:'+254712345678',status:'ACTIVE',ownerId:admin.id});
  const originalFetch = global.fetch;
  let paymentId:string|undefined;
  let reference='';let amount=0;let state='PENDING';let mismatch=false;let providerCalls=0;let checkoutCalls=0;
  const invoiceId=`invoice-${randomUUID()}`;
  function req(path:string,body:unknown,session=cookie) {return new NextRequest(`https://payments.test.invalid${path}`,{method:'POST',headers:{'Content-Type':'application/json',Cookie:session,Origin:'https://payments.test.invalid'},body:JSON.stringify(body)});}
  global.fetch = async (url,init) => {
    providerCalls++;
    const endpoint = String(url);assert.ok(endpoint.startsWith('https://sandbox.intasend.com/api/v1/'),'only expected provider invoked');
    const body = JSON.parse(String(init?.body));
    if (endpoint.endsWith('/checkout/')) {
      checkoutCalls++;reference=body.api_ref;amount=body.amount;
      assert.equal(body.unique_api_ref,true);assert.equal((init?.headers as Record<string,string>)['X-IntaSend-Public-API-Key'],'ISPubKey_test_mock');
      return Response.json({id:'checkout-route-test',url:'https://sandbox.intasend.com/checkout/checkout-route-test/express/',signature:'private-provider-signature',amount:400,currency:'KES'});
    }
    assert.equal((init?.headers as Record<string,string>).Authorization,'Bearer ISSecretKey_test_mock');
    return Response.json({invoice:{invoice_id:invoiceId,api_ref:reference,value:mismatch ? '1.00':String(amount),currency:'KES',state,provider_ref:'MPESA_ROUTE_TEST'}});
  };
  try {
    const created = await checkoutRoute.POST(req('/api/payments',{businessId:business.id,planId:'FEATURED',weeks:2,amountKes:1}));
    const payload = await created.json();assert.equal(created.status,200,JSON.stringify(payload));paymentId=payload.payment.id;
    assert.equal(payload.payment.amountKes,400);assert.equal(payload.payment.checkoutSignature,undefined);
    assert.equal((await Store.getBusinessById(business.id))!.activeTier,'NONE');
    console.log('PASS checkout route overrides client amount, persists provider checkout and redacts private signature');
    const params = {params:Promise.resolve({id:paymentId!})};
    const retry = await retryRoute.POST(req(`/api/payments/${paymentId}/retry`,{}),params);assert.equal(retry.status,200);assert.equal(checkoutCalls,1);
    console.log('PASS checkout retry reuses persisted checkout without another provider request');
    const forbidden = await verifyRoute.POST(req(`/api/payments/${paymentId}/verify`,{},''),params);assert.equal(forbidden.status,401);
    const forged = await webhookRoute.POST(req('/api/payments/webhook',{topic:'collection_event',challenge:'incorrect',api_ref:reference,invoice_id:invoiceId,state:'COMPLETE'}));assert.equal(forged.status,401);
    console.log('PASS payment verification authorization and webhook challenge');
    const event = {topic:'collection_event',challenge:'route-test-challenge',api_ref:reference,invoice_id:invoiceId,state:'COMPLETE'};
    state='FAILED';const failed = await webhookRoute.POST(req('/api/payments/webhook',event,''));assert.equal(failed.status,200);assert.equal((await Store.getBusinessById(business.id))!.activeTier,'NONE');
    console.log('PASS forged success payload cannot override provider-confirmed failure');
    state='COMPLETE';mismatch=true;const badAmount=await webhookRoute.POST(req('/api/payments/webhook',event,''));assert.equal(badAmount.status,409);assert.equal((await Store.getBusinessById(business.id))!.activeTier,'NONE');
    console.log('PASS authenticated provider amount mismatch never activates promotion');
    mismatch=false;const concurrent = await Promise.all([webhookRoute.POST(req('/api/payments/webhook',event,'')),webhookRoute.POST(req('/api/payments/webhook',event,'')),verifyRoute.POST(req(`/api/payments/${paymentId}/verify`,{}),params)]);
    assert.ok(concurrent.every(r=>r.status === 200));
    const promoted = (await Store.getBusinessById(business.id))!;
    assert.equal(promoted.activeTier,'FEATURED');assert.equal(Date.parse(promoted.tierEndsAt!)-Date.parse(promoted.tierStartsAt!),14*864e5);
    const complete = await Store.getPaymentById(paymentId!);assert.equal(complete?.state,'COMPLETE');assert.equal(complete?.providerInvoiceId,invoiceId);
    console.log('PASS concurrent verified webhook/status routes atomically activate exactly two weeks once in PostgreSQL');
    const callsBeforeReplay=providerCalls;
    state='FAILED';await webhookRoute.POST(req('/api/payments/webhook',{...event,invoice_id:'another-failed-attempt'},''));
    assert.equal(providerCalls,callsBeforeReplay);assert.equal((await Store.getPaymentById(paymentId!))?.state,'COMPLETE');
    console.log('PASS late failed invoice replay is acknowledged without regressing completion');
    const payments=await checkoutRoute.GET(new NextRequest('https://payments.test.invalid/api/payments?businessId='+business.id,{headers:{Cookie:cookie}}));
    assert.ok(!(await payments.text()).includes('private-provider-signature'));
    console.log('All 8 payment route/database checks passed. No external provider request was made.');
  } finally {
    global.fetch=originalFetch;
    await prisma.paymentRecord.deleteMany({where:{businessId:business.id}});await prisma.business.delete({where:{id:business.id}});await prisma.$disconnect();
  }
}
main().catch(error=>{console.error(error);process.exitCode=1;});
