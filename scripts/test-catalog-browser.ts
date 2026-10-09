import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {randomBytes} from 'node:crypto';
import {chromium,expect as baseExpect} from '@playwright/test';
const expect=baseExpect.configure({timeout:60000});
import sharp from 'sharp';

async function main(){
  const context=JSON.parse(readFileSync('/tmp/moimashinani-catalog-context.json','utf8')) as {token:string;freeSlug:string;proSlug:string;expiredSlug:string};
  const base='http://127.0.0.1:3101';
  const browser=await chromium.launch({headless:true});
  try {
    const owner=await browser.newContext({viewport:{width:390,height:844}});
    await owner.addCookies([{name:'mm_session',value:context.token,url:base}]);
    const page=await owner.newPage();page.setDefaultNavigationTimeout(120000);page.setDefaultTimeout(45000);
    const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
    let paymentPosts=0;page.on('request',request=>{if(request.url().endsWith('/api/payments') && request.method()==='POST')paymentPosts++;});
    await page.goto(`${base}/dashboard/${context.freeSlug}`);
    await expect(page.getByText('Free catalogue',{exact:true})).toBeVisible();
    await expect(page.getByText('5 / 5 public',{exact:true})).toBeVisible();
    await page.getByRole('button',{name:'services',exact:true}).click();
    await expect(page.getByRole('button',{name:'Add item',exact:true})).toBeDisabled();
    await expect(page.getByRole('link',{name:'Need more products? Pro is KES 500/month →'})).toBeVisible();
    assert.equal(paymentPosts,0,'Free dashboard must not start a checkout automatically');
    if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth))throw new Error('Free dashboard overflows mobile');
    await page.screenshot({path:'/tmp/moimashinani-catalog-free.png',fullPage:true});
    console.log('PASS Free usage panel, five-product limit and upgrade action');

    await page.goto(`${base}/dashboard/${context.proSlug}`);
    await expect(page.getByText('Pro catalogue',{exact:true})).toBeVisible();
    await expect(page.getByRole('heading',{name:/Pro ends in \d days/})).toBeVisible();
    await page.getByRole('button',{name:'services',exact:true}).click();
    await expect(page.getByRole('button',{name:'Add item',exact:true})).toBeEnabled();
    await page.getByLabel('Name',{exact:true}).fill('Browser Pro Product');
    await page.getByLabel('Starting price (KSh, optional)',{exact:true}).fill('250');
    const image=await sharp(randomBytes(1200*1200*3),{raw:{width:1200,height:1200,channels:3}}).png().toBuffer();
    assert.ok(image.length>4*1024*1024 && image.length<5*1024*1024);
    const preview=await sharp({create:{width:300,height:200,channels:3,background:'#335e41'}}).webp().toBuffer();
    let uploadedBytes=0;
    await page.route('https://images.test.invalid/**',route=>route.fulfill({status:200,contentType:'image/webp',body:preview}));
    await page.route(`${base}/api/uploads`,async route=>{
      const request=route.request();assert.equal(request.method(),'POST');
      const body=request.postDataBuffer()!;assert.ok(body.length<4.5*1024*1024,'Multipart upload fits Vercel request limit');
      const form=await new Request(request.url(),{method:'POST',headers:{'Content-Type':request.headers()['content-type']},body:new Uint8Array(body)}).formData();
      assert.ok(form.get('businessId'));
      const file=form.get('files') as File;uploadedBytes=file.size;assert.ok(file.size<=1024*1024);assert.equal(file.type,'image/webp');
      await route.fulfill({status:201,contentType:'application/json',body:JSON.stringify({photos:['https://images.test.invalid/pro-product.webp']})});
    });
    await page.getByLabel('Product / service photo (optional)',{exact:true}).setInputFiles({name:'large-source.png',mimeType:'image/png',buffer:image});
    await expect(page.getByRole('img',{name:'Selected product',exact:true})).toBeVisible();
    assert.ok(uploadedBytes>0);
    await page.getByRole('button',{name:'Add item',exact:true}).click();
    await expect(page.getByText('Browser Pro Product',{exact:true})).toBeVisible();
    await expect(page.getByText('36 · Unlimited',{exact:true})).toBeVisible();
    console.log('PASS Pro catalogue above the former 30-item cap and client compression of a 4 MB source image');

    await page.goto(`${base}/dashboard/${context.expiredSlug}`);
    await expect(page.getByRole('heading',{name:'Your Pro plan has ended',exact:true})).toBeVisible();
    await page.getByRole('button',{name:'services',exact:true}).click();
    await expect(page.getByText('Saved · hidden on Free',{exact:true})).toBeVisible();
    await page.getByRole('button',{name:'Show on Free',exact:true}).click();
    await expect(page.getByText('Changes saved.',{exact:true})).toBeVisible();
    const publicBusiness=await (await fetch(`${base}/api/businesses/${context.expiredSlug}`)).json();assert.equal(publicBusiness.services.length,5);
    assert.equal(paymentPosts,0,'Expiry must never start checkout automatically');
    await page.screenshot({path:'/tmp/moimashinani-catalog-expired.png',fullPage:true});
    console.log('PASS expired plan retains hidden products, lets owners choose five public items and never auto-renews');

    await page.goto(`${base}/pro/${context.proSlug}`);
    await expect(page.getByRole('heading',{name:'Grow your catalogue',exact:true})).toBeVisible();
    await expect(page.getByRole('cell',{name:'Unlimited',exact:true})).toHaveCount(2);
    await expect(page.getByRole('heading',{name:'Renew for another month',exact:true})).toBeVisible();
    await page.screenshot({path:'/tmp/moimashinani-catalog-checkout.png',fullPage:true});
    await page.route(`${base}/api/payments`,async route=>{
      const body=route.request().postDataJSON();assert.equal(body.planId,'PRO');assert.equal(body.weeks,1);
      await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({checkoutUrl:'https://sandbox.intasend.com/checkout/mock/express/',payment:{id:'mock-pro',planId:'PRO',state:'PENDING',amountKes:500}})});
    });
    await page.route('https://sandbox.intasend.com/checkout/mock/express/',route=>route.fulfill({status:200,contentType:'text/html',body:'<h1>Mock hosted checkout</h1>'}));
    await page.getByRole('button',{name:'Continue to checkout · KES 500',exact:true}).click();
    await expect(page).toHaveURL('https://sandbox.intasend.com/checkout/mock/express/');
    assert.equal(paymentPosts,1);
    assert.deepEqual(errors,[]);
    console.log('PASS mobile plan comparison, renewal dates and explicit hosted checkout navigation (provider mocked)');
  }finally{await browser.close();}
}
main().catch(error=>{console.error(error);process.exitCode=1;});
