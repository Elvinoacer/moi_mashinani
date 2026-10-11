import { randomUUID } from 'node:crypto';
import { readFileSync, mkdirSync } from 'node:fs';
import { chromium, expect } from '@playwright/test';
const config=JSON.parse(readFileSync('/tmp/moimashinani-test-context.json','utf8'));
async function main() {
  process.env.DATABASE_URL=config.databaseUrl;process.env.DATABASE_IP_FAMILY='';
  const {prisma}=await import('../src/lib/prisma');
  const template=await prisma.account.findUniqueOrThrow({where:{email:config.admin.email}});
  const credentials={email:`notification-browser-${randomUUID().slice(0,8)}@test.invalid`,password:config.admin.password};
  const account=await prisma.account.create({data:{email:credentials.email,name:'Notification Browser Admin',passwordHash:template.passwordHash,role:'ADMIN',emailVerifiedAt:new Date()}});
  const browser=await chromium.launch({headless:true,executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE});
  const errors:string[]=[];
  try {
    const context=await browser.newContext({baseURL:config.baseUrl,viewport:{width:390,height:844}});
    // No real Firebase requests: only exercise consent/UI before permission is requested.
    await context.route('**/api/notifications/config',route=>route.fulfill({json:{enabled:true,config:{apiKey:'test',authDomain:'test.invalid',projectId:'test',messagingSenderId:'123',appId:'test'},vapidKey:'test'}}));
    // Headless Chromium denies notifications by default. Model an undecided user.
    await context.addInitScript("Object.defineProperty(Notification, 'permission', {get: function() { return 'default'; }});");
    const page=await context.newPage();page.setDefaultTimeout(90000);page.on('pageerror',error=>errors.push(error.message));
    await page.goto('/login?next=/admin');
    await page.getByLabel('Email address').fill(credentials.email);await page.getByLabel('Password',{exact:true}).fill(credentials.password);
    await page.getByRole('button',{name:'Sign in',exact:true}).click();
    await page.waitForURL(url => url.pathname === '/admin');
    await expect(page.getByRole('dialog',{name:'Keep up with your review queue'})).toBeVisible({timeout:45000});
    await expect(page.getByRole('button',{name:'Allow notifications',exact:true})).toBeVisible();
    mkdirSync('/tmp/moimashinani-notifications',{recursive:true});
    await page.screenshot({path:'/tmp/moimashinani-notifications/prompt-mobile.png'});
    await page.getByRole('button',{name:'Maybe later',exact:true}).click();
    await expect(page.getByRole('dialog')).not.toBeVisible();
    await page.reload();await page.getByRole('button',{name:/^Notifications/}).waitFor();
    await page.waitForTimeout(5000);await expect(page.getByRole('dialog')).not.toBeVisible();
    // Expire snooze to verify decline separately; no browser permission dialog is opened.
    await page.evaluate(()=>{for(let i=localStorage.length-1;i>=0;i--){const key=localStorage.key(i)!;if(key.startsWith('mm-push-dismissed/'))localStorage.removeItem(key);}});
    await page.reload();await expect(page.getByRole('dialog',{name:'Keep up with your review queue'})).toBeVisible({timeout:45000});
    await page.getByRole('button',{name:'No thanks',exact:true}).click();
    await expect(page.getByRole('dialog')).not.toBeVisible({timeout:30000});
    await page.reload();await page.getByRole('button',{name:/^Notifications/}).waitFor();await page.waitForTimeout(5000);
    await expect(page.getByRole('dialog')).not.toBeVisible();
    await page.getByRole('button',{name:/^Notifications/}).click();
    await expect(page.getByRole('dialog',{name:'Your notifications'})).toBeVisible();
    await expect(page.getByRole('button',{name:'Enable notifications',exact:true})).toBeVisible();
    await expect(page.getByText(/Delivery health:/)).toBeVisible();
    await page.screenshot({path:'/tmp/moimashinani-notifications/inbox-mobile.png'});
    if (errors.length) throw new Error(errors.join('\n'));
    console.log('PASS mobile notification prompt, seven-day snooze, explicit decline, inbox, settings and admin delivery health; no browser errors');
  } finally {await browser.close();await prisma.account.delete({where:{id:account.id}});await prisma.$disconnect();}
}
main().catch(error=>{console.error(error);process.exitCode=1;});
