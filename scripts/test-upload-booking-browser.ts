import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {chromium,expect as baseExpect} from '@playwright/test';
import sharp from 'sharp';
import {createServer} from 'node:http';
import {once} from 'node:events';
import type {AddressInfo} from 'node:net';
const expect=baseExpect.configure({timeout:60000});

async function main(){
  const fixture=JSON.parse(readFileSync('/tmp/moimashinani-catalog-context.json','utf8')) as {token:string;adminToken?:string;proSlug:string};
  const studentName=`Campus Student UX ${Date.now()}`;
  const serviceName=`Browser booking service ${Date.now()}`;
  const base='http://127.0.0.1:3101';
  const browser=await chromium.launch({headless:true});
  const errors:string[]=[];
  const owner=await browser.newContext({viewport:{width:390,height:844}});
  await owner.addCookies([{name:'mm_session',value:fixture.token,url:base}]);
  const page=await owner.newPage();page.setDefaultNavigationTimeout(120000);
  page.on('pageerror',error=>errors.push(error.message));
  const buffer=await sharp({create:{width:1200,height:800,channels:3,background:'#335e41'}}).png().toBuffer();
  let posts=0;let failUpload=true;let release:(()=>void)|undefined;
  const uploadServer=createServer(async(req,res)=>{
    res.setHeader('Access-Control-Allow-Origin',base);
    if(req.method==='OPTIONS'){res.setHeader('Access-Control-Allow-Methods','POST,DELETE,OPTIONS');res.end();return;}
    if(req.method!=='POST'){res.end('{}');return;}
    for await(const chunk of req) {void chunk;}
    posts++;
    await new Promise<void>(resolve=>{release=resolve;});
    res.setHeader('Content-Type','application/json');
    if(failUpload){res.statusCode=409;res.end(JSON.stringify({error:'Your Free image storage is full. Remove photos or renew Pro.'}));}
    else{res.statusCode=201;res.end(JSON.stringify({photos:['https://images.test.invalid/gallery.webp']}));}
  });
  uploadServer.listen(0,'127.0.0.1');await once(uploadServer,'listening');
  const uploadPort=(uploadServer.address() as AddressInfo).port;
  const photo={name:'campus-shop.png',mimeType:'image/png',buffer};
  const preview=await sharp(buffer).webp().toBuffer();
  await page.route('https://images.test.invalid/**',route=>route.fulfill({status:200,contentType:'image/webp',body:preview}));
  try {
    await page.goto(`${base}/dashboard/${fixture.proSlug}`);
    await page.getByRole('button',{name:'photos',exact:true}).click();
    const picker=page.getByLabel('Add business photos',{exact:true});
    await picker.setInputFiles({name:'bad.pdf',mimeType:'application/pdf',buffer:Buffer.from('invalid')});
    await expect(page.getByRole('alert').filter({hasText:'Unsupported format'})).toBeVisible();
    await picker.setInputFiles({name:'broken.png',mimeType:'image/png',buffer:Buffer.from('broken image')});
    await expect(page.getByRole('alert').filter({hasText:'could not be read'})).toBeVisible();
    console.log('PASS unsupported and damaged file reasons stay beside the upload picker');

    await page.route(`${base}/api/uploads`,route=>route.continue({url:`http://127.0.0.1:${uploadPort}/uploads`}));
    await picker.setInputFiles(photo);
    await expect(page.getByText('Processing on server',{exact:true})).toBeVisible();
    await expect(page.getByRole('status').filter({hasText:'Keep this page open'})).toBeVisible();
    await expect(picker).toBeDisabled();
    release!();
    await expect(page.getByRole('alert').filter({hasText:'storage is full'})).toBeVisible();
    failUpload=false;
    let failSave=true;let saves=0;
    await page.route(`${base}/api/businesses/${fixture.proSlug}`,async route=>{
      if(route.request().method()==='PATCH'){saves++;if(failSave){await route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({error:'Saving photos is temporarily unavailable. Please retry.'})});return;}}
      await route.continue();
    });
    await page.getByRole('button',{name:'Retry upload',exact:true}).click();
    await expect(page.getByText('Processing on server',{exact:true})).toBeVisible();release!();
    await expect(page.getByRole('button',{name:'Retry saving',exact:true})).toBeVisible();
    await expect(page.getByText('Your photos uploaded, but saving them to the listing failed. Retry saving without uploading again.')).toBeVisible();
    failSave=false;
    await page.getByRole('button',{name:'Retry saving',exact:true}).click();
    await expect(page.getByRole('status').filter({hasText:'Done. Your photos are saved'})).toBeVisible();
    assert.equal(posts,2);assert.equal(saves,2,'Saving retry must not upload another copy');
    await page.screenshot({path:'/tmp/moimashinani-upload-gallery.png',fullPage:true});
    console.log('PASS processing, quota failure, retry upload, failed save and retry without duplicate uploads');

    await page.getByRole('button',{name:'services',exact:true}).click();
    await page.getByLabel('Name',{exact:true}).fill(serviceName);
    await page.getByLabel('Product / service photo (optional)',{exact:true}).setInputFiles(photo);
    await expect(page.getByText('Processing on server',{exact:true})).toBeVisible();release!();
    await expect(page.getByRole('status').filter({hasText:'Save the item to attach this photo'})).toBeVisible();
    await page.getByRole('button',{name:'Add item',exact:true}).click();
    await expect(page.getByText(serviceName,{exact:true})).toBeVisible();
    console.log('PASS product photo distinguishes uploaded draft from saved catalogue item');

    await owner.addCookies([{name:'mm_session',value:fixture.adminToken||fixture.token,url:base}]);
    await page.goto(`${base}/admin/enroll`);
    await page.getByLabel('Business and product photos',{exact:true}).setInputFiles(photo);
    await expect(page.getByText('Processing on server',{exact:true})).toBeVisible();release!();
    await expect(page.getByRole('status').filter({hasText:'Submit this form to save the photos'})).toBeVisible();
    await expect(page.getByRole('img',{name:'Business photo 1',exact:true})).toBeVisible();
    await page.screenshot({path:'/tmp/moimashinani-upload-enrollment.png',fullPage:true});
    console.log('PASS enrollment upload status and photo preview');
    await owner.addCookies([{name:'mm_session',value:fixture.token,url:base}]);

    const customer=await browser.newContext({viewport:{width:390,height:844}});
    const front=await customer.newPage();front.setDefaultNavigationTimeout(120000);front.on('pageerror',error=>errors.push(error.message));
    await front.goto(base);
    const card=front.getByRole('article').filter({has:front.getByRole('button',{name:/Request booking with/})}).first();
    await card.getByRole('button',{name:/Request booking with/}).click();
    await expect(front.getByRole('dialog')).toBeVisible();
    const overlay=await front.getByRole('dialog').evaluate(node=>{const rect=node.parentElement!.getBoundingClientRect();return {x:rect.x,y:rect.y,width:rect.width,height:rect.height};});
    assert.deepEqual(overlay,{x:0,y:0,width:390,height:844},'Booking overlay must cover the viewport');
    await expect(front.getByText(/No account needed. Choose your preferred time/)).toBeVisible();
    await front.getByLabel('Your name',{exact:true}).fill(studentName);
    await front.getByLabel('Your phone / WhatsApp',{exact:true}).fill('123');
    await front.getByRole('button',{name:'Submit booking request',exact:true}).click();
    await expect(front.getByRole('alert').filter({hasText:/mobile number/i})).toBeVisible();
    await front.getByLabel('Your phone / WhatsApp',{exact:true}).fill('0712345678');
    const saved=front.waitForResponse(response=>response.url().endsWith('/api/bookings')&&response.request().method()==='POST'&&response.status()===201);
    await front.getByRole('button',{name:'Submit booking request',exact:true}).click();
    const booking=await (await saved).json();assert.equal(booking.studentName,studentName);
    await expect(front.getByRole('heading',{name:'Booking request saved',exact:true})).toBeVisible();
    await front.screenshot({path:'/tmp/moimashinani-booking-success.png',fullPage:false});
    const business=await (await owner.request.get(`${base}/api/auth/me`)).json();
    const booked=business.businesses.find((item:{id:string})=>item.id===booking.businessId);
    await page.goto(`${base}/dashboard/${booked.slug}`);
    await page.getByRole('button',{name:/^bookings/}).click();
    await expect(page.getByText(studentName,{exact:true})).toBeVisible();
    console.log('PASS anonymous homepage booking, useful invalid-phone error, real database save and owner inbox');

    await front.goto(`${base}/search`);
    await expect(front.getByRole('button',{name:/Request booking with/}).first()).toBeVisible();
    await front.getByRole('button',{name:/Request booking with/}).first().click();
    await expect(front.getByRole('dialog')).toBeVisible();await front.getByRole('button',{name:'Close dialog',exact:true}).click();
    await front.locator(`a[href="/b/${fixture.proSlug}"]`).first().click();
    await expect(front).toHaveURL(`${base}/b/${fixture.proSlug}`);
    await front.getByRole('button',{name:'Book',exact:true}).click();
    await expect(front.getByRole('dialog')).toBeVisible();await front.getByRole('button',{name:'Close dialog',exact:true}).click();
    await front.getByRole('button',{name:`Request ${serviceName}`,exact:true}).click();
    await expect(front.getByLabel('Service',{exact:true})).toHaveValue(serviceName);
    const nameInput=front.getByLabel('Your name',{exact:true});await nameInput.focus();
    await front.waitForTimeout(11000);await expect(nameInput).toBeFocused();
    assert.ok(await front.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
    assert.deepEqual(errors,[]);
    console.log('PASS search booking, mobile sticky booking, selected item, preserved input focus and no browser errors');
  } finally {release?.();await browser.close();uploadServer.closeAllConnections();await new Promise<void>(resolve=>uploadServer.close(()=>resolve()));}
}
main().catch(error=>{console.error(error);process.exitCode=1;});
