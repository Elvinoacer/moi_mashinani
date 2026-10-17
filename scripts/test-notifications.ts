import assert from 'node:assert/strict';
import { test, mock, afterEach } from 'node:test';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { notificationEmail, promptEligible, safeNotificationPath } from '../src/lib/notification-content';
import { sendNotificationEmail } from '../src/lib/mail';
afterEach(() => mock.restoreAll());
test('decline is respected; dismissal defers prompts for seven days', () => {
  const now = Date.now();
  assert.equal(promptEligible('default',false,0,now),true);
  assert.equal(promptEligible('default',true,0,now),false);
  assert.equal(promptEligible('denied',false,0,now),false);
  assert.equal(promptEligible('granted',false,0,now),false);
  assert.equal(promptEligible('default',false,now-6*864e5,now),false);
  assert.equal(promptEligible('default',false,now-7*864e5,now),true);
});
test('email renders escaped content and a button without a visible raw URL', () => {
  const html = notificationEmail('<script>bad</script>','A&B "details"','Open dashboard','https://example.com/notifications/open/123','<Owner>');
  assert.ok(!html.includes('<script>'));
  assert.ok(html.includes('&lt;Owner&gt;'));
  assert.ok(html.includes('href="https://example.com/notifications/open/123"'));
  assert.ok(!html.includes('>https://example.com'));
  assert.ok(html.includes('Open dashboard</a>'));
});
test('dashboard paths reject external destinations and unsafe paths', () => {
  for (const path of ['//evil.com','https://evil.com','/dashboard\\evil','/dashboard\n','/verify?token=secret']) assert.equal(safeNotificationPath(path),'/dashboard');
  assert.equal(safeNotificationPath('/dashboard/my-business'),'/dashboard/my-business');
  assert.equal(safeNotificationPath('/search?q=calculator'),'/search?q=calculator');
  assert.equal(safeNotificationPath('/market'),'/market');
});
test('service email carries a stable provider idempotency key and requires acceptance', async () => {
  const previous = {...process.env};
  try {
    process.env.RESEND_API_KEY='test-key';process.env.EMAIL_FROM='test@example.com';
    mock.method(globalThis,'fetch',async (_url:unknown,options:RequestInit) => {
      assert.equal(new Headers(options.headers).get('Idempotency-Key'),'notification/delivery-1');
      const body=JSON.parse(String(options.body));assert.ok(body.html.includes('Open dashboard</a>'));
      return Response.json({id:'accepted'});
    });
    await sendNotificationEmail('owner@example.com','Owner','Approved','Upload photos','Open dashboard','https://example.com/dashboard','notification/delivery-1');
    mock.restoreAll();mock.method(globalThis,'fetch',async () => Response.json({},{status:503}));
    await assert.rejects(sendNotificationEmail('owner@example.com','Owner','Approved','Upload photos','Open dashboard','https://example.com/dashboard','notification/delivery-1'));
  } finally {process.env=previous;}
});
function worker(windows:unknown[] = []) {
  const handlers:Record<string,(event:unknown)=>void> = {};
  const banners:unknown[]=[];const opened:string[]=[];
  const self={location:{origin:'https://example.com'},addEventListener:(name:string,handler:(event:unknown)=>void) => {handlers[name]=handler;},registration:{showNotification:async (title:string,options:unknown) => {banners.push({title,options});}},clients:{matchAll:async () => windows,openWindow:async (url:string) => {opened.push(url);}}};
  vm.runInNewContext(readFileSync('public/firebase-messaging-sw.js','utf8'),{self,URL});
  return {handlers,banners,opened};
}
test('background FCM displays one tagged alert; foreground delivers to visible client',async () => {
  const data={id:'notice1',title:'Approved',body:'Open your account',url:'https://example.com/notifications/open/notice1'};
  const w=worker();let pending:Promise<void>|undefined;
  w.handlers.push({data:{json:() => ({data})},waitUntil:(p:Promise<void>) => {pending=p;}});await pending;
  assert.equal(w.banners.length,1);assert.equal((w.banners[0] as {options:{tag:string}}).options.tag,'mm-notice1');
  const messages:unknown[]=[];
  const foreground=worker([{visibilityState:'visible',postMessage:(payload:unknown) => messages.push(payload)}]);
  foreground.handlers.push({data:{json:() => ({data})},waitUntil:(p:Promise<void>) => {pending=p;}});await pending;
  assert.equal(foreground.banners.length,0);assert.equal(messages.length,1);
});
test('notification clicks cannot navigate to an external site',async () => {
  const w=worker();let pending:Promise<void>|undefined;
  w.handlers.notificationclick({notification:{close:() => {},data:{url:'https://evil.com'}},waitUntil:(p:Promise<void>) => {pending=p;}});await pending;
  assert.deepEqual(w.opened,['https://example.com/dashboard']);
});
