import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {mock} from 'node:test';
import sharp from 'sharp';
import {S3Client,PutObjectCommand,DeleteObjectCommand} from '@aws-sdk/client-s3';
import {NextRequest} from 'next/server';
import {prisma} from '../src/lib/prisma';
import {enrollmentMediaHash,ENROLLMENT_MEDIA_COOKIE} from '../src/lib/enrollment-media';

async function main() {
  const prior={...process.env};
  const tag=randomUUID().slice(0,8);
  Object.assign(process.env,{
    APP_URL:'https://app.test.invalid',
    R2_ACCOUNT_ID:'mock-r2',R2_ACCESS_KEY_ID:'key',R2_SECRET_ACCESS_KEY:'secret',
    R2_BUCKET_NAME:'gtss',R2_ENDPOINT:'https://mock-r2.r2.cloudflarestorage.com',
    R2_PUBLIC_URL:'https://staging-media.test.invalid',R2_KEY_PREFIX:'moimashinani',
  });
  const {POST,DELETE}=await import('../app/api/enrollment/media/route');
  const writes:PutObjectCommand[]=[];const deletes:DeleteObjectCommand[]=[];
  mock.method(S3Client.prototype,'send',async(command:PutObjectCommand|DeleteObjectCommand)=>{
    if(command instanceof PutObjectCommand) writes.push(command);
    else if(command instanceof DeleteObjectCommand) deletes.push(command);
    return {};
  });
  const png=await sharp({create:{width:400,height:250,channels:3,background:'#335e41'}}).png().toBuffer();
  function upload(bytes:Buffer,session='',origin='https://app.test.invalid') {
    const form=new FormData();
    form.append('files',new Blob([new Uint8Array(bytes)],{type:'image/png'}),'photo.png');
    return new NextRequest('https://app.test.invalid/api/enrollment/media',{method:'POST',headers:{Origin:origin,Cookie:session,'X-Forwarded-For':'2001:db8::'+tag},body:form});
  }
  const used:string[]=[];let cookie='';
  try {
    assert.equal((await POST(upload(png,'','https://evil.test.invalid'))).status,403,'cross-site upload blocked');
    assert.equal((await POST(upload(Buffer.from('<svg>fake</svg>')))).status,400,'fake PNG blocked');
    assert.equal(writes.length,0);
    const first=await POST(upload(png));
    assert.equal(first.status,201,await first.clone().text());
    cookie=first.headers.get('set-cookie')?.split(';')[0] || '';
    assert.match(cookie,new RegExp('^'+ENROLLMENT_MEDIA_COOKIE+'=[a-f0-9]{64}'));
    assert.match(first.headers.get('set-cookie') || '',/httponly/i);
    const token=cookie.split('=')[1];
    const hash=enrollmentMediaHash(token)!;
    const a=(await first.json()).photos[0] as string;used.push(a);
    assert.match(a,/^https:\/\/staging-media\.test\.invalid\/moimashinani\/photos\/staging-/);
    const second=await POST(upload(png,cookie));
    assert.equal(second.status,201,await second.clone().text());
    const b=(await second.json()).photos[0] as string;used.push(b);
    assert.equal(await prisma.enrollmentMedia.count({where:{sessionHash:hash}}),2,'both uploads belong to this browser session');
    assert.equal(writes.length,2);
    assert.ok(writes.every(w=>w.input.ContentType==='image/webp'),'upload converts to WebP');
    assert.equal((await DELETE(new NextRequest('https://app.test.invalid/api/enrollment/media?url='+encodeURIComponent(a),{method:'DELETE',headers:{Origin:'https://app.test.invalid'}}))).status,403,'a different browser cannot delete assets');
    const deleted=await DELETE(new NextRequest('https://app.test.invalid/api/enrollment/media?url='+encodeURIComponent(a),{method:'DELETE',headers:{Origin:'https://app.test.invalid',Cookie:cookie}}));
    assert.equal(deleted.status,200,await deleted.clone().text());
    used.shift();
    assert.equal(deletes.length,1);
    assert.equal(await prisma.enrollmentMedia.count({where:{sessionHash:hash}}),1);
    console.log('PASS anonymous pre-verification photo upload, WebP conversion, scoped cookie, deletion and CSRF checks');
  } finally {
    for(const url of used){
      const response=await DELETE(new NextRequest('https://app.test.invalid/api/enrollment/media?url='+encodeURIComponent(url),{method:'DELETE',headers:{Origin:'https://app.test.invalid',Cookie:cookie}}));
      assert.equal(response.status,200,'cleanup staged photo');
    }
    mock.restoreAll();Object.assign(process.env,prior);
    await prisma.$disconnect();
  }
}
main().catch(error=>{console.error(error);process.exitCode=1;});
