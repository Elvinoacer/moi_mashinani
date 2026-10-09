import 'dotenv/config';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { DeleteObjectCommand } from '@aws-sdk/client-s3';
import sharp from 'sharp';
import { r2Storage, uploadPhotosToR2 } from '../src/lib/r2';

async function main() {
  const image = await sharp({ create: { width: 8, height: 8, channels: 3, background: '#335e41' } }).webp().toBuffer();
  const storage = r2Storage();
  let photo: string | undefined;
  try {
    [photo] = await uploadPhotosToR2(`storage-check-${randomUUID()}`, [image]);
    console.log('PASS authenticated upload to the dedicated R2 folder');
    const response = await fetch(photo, { signal: AbortSignal.timeout(15000) });
    assert.equal(response.status, 200, 'Public R2 URL must serve the uploaded photo');
    assert.equal(response.headers.get('content-type'), 'image/webp');
    assert.deepEqual(Buffer.from(await response.arrayBuffer()), image);
    console.log('PASS public URL returns the exact WebP bytes');
  } finally {
    if (photo) {
      await storage.client.send(new DeleteObjectCommand({ Bucket: storage.bucket, Key: photo.slice(storage.publicUrl.length + 1) }));
      console.log('PASS temporary verification object removed');
    }
    storage.client.destroy();
  }
}
main().catch(error => {
  console.error('R2 live verification failed:', error instanceof Error ? error.message : 'Unknown error');
  process.exitCode = 1;
});
