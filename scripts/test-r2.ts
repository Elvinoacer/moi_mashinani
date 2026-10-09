import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { afterEach, beforeEach, mock, test } from 'node:test';
import { DeleteObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { NextRequest } from 'next/server';
import sharp from 'sharp';
import { r2Storage, uploadPhotosToR2 } from '../src/lib/r2';

const originalEnv = { ...process.env };
beforeEach(() => {
  Object.assign(process.env, {
    DATABASE_URL: 'postgresql://test:test@localhost:5432/unused',
    APP_URL: 'https://app.test.invalid',
    R2_ACCOUNT_ID: 'test-account', R2_ACCESS_KEY_ID: 'test-key', R2_SECRET_ACCESS_KEY: 'test-secret',
    R2_BUCKET_NAME: 'gtss', R2_ENDPOINT: 'https://test-account.r2.cloudflarestorage.com',
    R2_PUBLIC_URL: 'https://media.test.invalid/', R2_KEY_PREFIX: 'moimashinani',
  });
});
afterEach(() => { mock.restoreAll(); process.env = { ...originalEnv }; });

test('uploads use the dedicated folder, unique keys and public WebP URLs', async () => {
  const writes: PutObjectCommand[] = [];
  mock.method(S3Client.prototype, 'send', async (command: PutObjectCommand) => { writes.push(command); return {}; });
  const photos = await uploadPhotosToR2('owner', [Buffer.from('first'), Buffer.from('second')]);
  assert.equal(new Set(photos).size, 2);
  for (const [index, photo] of photos.entries()) {
    assert.match(photo, /^https:\/\/media\.test\.invalid\/moimashinani\/photos\/owner\/[0-9a-f-]{36}\.webp$/);
    assert.equal(writes[index].input.Bucket, 'gtss');
    assert.equal(writes[index].input.ContentType, 'image/webp');
    assert.equal(writes[index].input.CacheControl, 'public, max-age=31536000, immutable');
    assert.equal(photo, `https://media.test.invalid/${writes[index].input.Key}`);
  }
});

test('partial failure removes only keys attempted by this upload', async () => {
  const writes: string[] = []; const deletes: string[] = [];
  mock.method(S3Client.prototype, 'send', async (command: PutObjectCommand | DeleteObjectCommand) => {
    if (command instanceof PutObjectCommand) {
      writes.push(command.input.Key!);
      if (writes.length === 2) throw new Error('private provider error');
    } else deletes.push(command.input.Key!);
    return {};
  });
  await assert.rejects(uploadPhotosToR2('owner', [Buffer.from('a'), Buffer.from('b'), Buffer.from('c')]),
    { status: 502, message: 'Photo storage is temporarily unavailable. Please try again.' });
  assert.equal(writes.length, 2);
  assert.deepEqual(deletes, writes);
});

test('missing credentials fail closed rather than falling back to database storage', () => {
  delete process.env.R2_SECRET_ACCESS_KEY;
  assert.throws(r2Storage, { status: 503 });
});

test('unsafe folders and non-HTTPS URLs are rejected before sending credentials', () => {
  process.env.R2_KEY_PREFIX = '../other-app';
  assert.throws(r2Storage, { status: 503 });
  process.env.R2_KEY_PREFIX = 'moimashinani';
  process.env.R2_ENDPOINT = 'http://unsafe.test.invalid';
  assert.throws(r2Storage, { status: 503 });
});

test('photo route authenticates, validates the whole batch and sends re-encoded bytes to R2', async () => {
  const { prisma } = await import('../src/lib/prisma');
  const { POST } = await import('../app/api/uploads/route');
  const writes: PutObjectCommand[] = [];
  const originalFindSession = prisma.accountSession.findUnique;
  const originalCreatePhoto = prisma.uploadedPhoto.create;
  const originalQuery = prisma.$queryRaw;
  prisma.accountSession.findUnique = mock.fn(async () => ({
    expiresAt: new Date(Date.now() + 60000),
    account: { id: 'owner', email: 'owner@test.invalid', name: 'Owner', role: 'ADMIN', emailVerifiedAt: new Date() },
  })) as unknown as typeof originalFindSession;
  prisma.$queryRaw = mock.fn(async () => [{ count: 1 }]) as typeof originalQuery;
  prisma.uploadedPhoto.create = mock.fn(() => { throw new Error('New photos must not be stored in PostgreSQL'); }) as typeof originalCreatePhoto;
  const media: Array<{id:string;accountId:string;businessId:string|null;url:string|null;bytes:number;state:string}> = [];
  const originalTransaction = prisma.$transaction;
  const originalMedia = {findMany:prisma.businessMedia.findMany,create:prisma.businessMedia.create,update:prisma.businessMedia.update,updateMany:prisma.businessMedia.updateMany};
  prisma.$transaction = mock.fn(async (operation: unknown) => typeof operation === 'function' ? operation(prisma) : Promise.all(operation as Promise<unknown>[])) as unknown as typeof originalTransaction;
  prisma.businessMedia.findMany = mock.fn(async () => media) as unknown as typeof originalMedia.findMany;
  prisma.businessMedia.create = mock.fn(async ({data}: {data:{accountId:string;businessId?:string;bytes:number}}) => {
    const record={...data,id:randomUUID(),businessId:data.businessId || null,url:null,state:'RESERVED'};media.push(record);return record;
  }) as unknown as typeof originalMedia.create;
  prisma.businessMedia.update = mock.fn(async ({where,data}:{where:{id:string};data:Record<string,unknown>}) => {
    const record=media.find(item=>item.id===where.id)!;Object.assign(record,data);return record;
  }) as unknown as typeof originalMedia.update;
  prisma.businessMedia.updateMany = mock.fn(async ({data}:{data:Record<string,unknown>}) => {media.forEach(record=>Object.assign(record,data));return {count:media.length};}) as unknown as typeof originalMedia.updateMany;
  mock.method(S3Client.prototype, 'send', async (command: PutObjectCommand) => { writes.push(command); return {}; });
  const png = await sharp({ create: { width: 1800, height: 200, channels: 3, background: '#335e41' } }).png().toBuffer();
  function request(files: Buffer[], signedIn = true, origin = 'https://app.test.invalid') {
    const form = new FormData();
    files.forEach(file => form.append('files', new Blob([new Uint8Array(file)], { type: 'image/png' }), 'shop.png'));
    return new NextRequest('https://app.test.invalid/api/uploads', {
      method: 'POST', headers: { Cookie: signedIn ? `mm_session=${'a'.repeat(64)}` : '', Origin: origin }, body: form,
    });
  }
  try {
    assert.equal((await POST(request([png], false))).status, 401);
    assert.equal((await POST(request([png], true, 'https://other.test.invalid'))).status, 403);
    assert.equal((await POST(request([png, Buffer.from('<svg>fake</svg>')]))).status, 400);
    assert.equal((await POST(request(Array(9).fill(png)))).status, 400);
    assert.equal((await POST(request([Buffer.alloc(5 * 1024 * 1024 + 1)]))).status, 400);
    assert.equal(writes.length, 0, 'Rejected requests must never write objects');
    const response = await POST(request([png]));
    assert.equal(response.status, 201);
    const { photos } = await response.json();
    assert.equal(photos.length, 1);
    assert.match(photos[0], /^https:\/\/media\.test\.invalid\/moimashinani\/photos\/owner\//);
    const metadata = await sharp(writes[0].input.Body as Buffer).metadata();
    assert.equal(metadata.format, 'webp');
    assert.equal(metadata.width, 1600);
    assert.equal(metadata.exif, undefined);
    assert.equal(media[0].bytes,(writes[0].input.Body as Buffer).length);
    assert.equal(media[0].state,'READY');
    assert.equal(media[0].url,photos[0]);
    const { businessInput } = await import('../src/lib/business-input');
    assert.deepEqual(businessInput({ photos }, true).photos, photos);
  } finally {
    prisma.accountSession.findUnique = originalFindSession;
    prisma.uploadedPhoto.create = originalCreatePhoto;
    prisma.$queryRaw = originalQuery;
    prisma.$transaction = originalTransaction;
    Object.assign(prisma.businessMedia,originalMedia);
    await prisma.$disconnect();
  }
});
