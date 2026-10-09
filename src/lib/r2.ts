import { randomUUID } from 'node:crypto';
import { DeleteObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { ApiError } from './api';

export function r2Storage() {
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  const bucket = process.env.R2_BUCKET_NAME;
  const endpoint = process.env.R2_ENDPOINT || (process.env.R2_ACCOUNT_ID
    ? `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com` : '');
  const publicUrl = process.env.R2_PUBLIC_URL?.replace(/\/+$/, '');
  const prefix = (process.env.R2_KEY_PREFIX || 'moimashinani').replace(/^\/+|\/+$/g, '');
  if (!accessKeyId || !secretAccessKey || !bucket || !endpoint || !publicUrl) {
    throw new ApiError(503, 'Photo storage is not configured. Please contact the administrator.');
  }
  if (!/^[a-zA-Z0-9_-]+(?:\/[a-zA-Z0-9_-]+)*$/.test(prefix)) {
    throw new ApiError(503, 'Photo storage folder is not configured correctly.');
  }
  try {
    for (const value of [endpoint, publicUrl]) {
      const url = new URL(value);
      if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash) throw new Error();
    }
  } catch {
    throw new ApiError(503, 'Photo storage URLs are not configured correctly.');
  }
  const client = new S3Client({
    region: 'auto', endpoint,
    credentials: { accessKeyId, secretAccessKey },
    requestChecksumCalculation: 'WHEN_REQUIRED',
    responseChecksumValidation: 'WHEN_REQUIRED',
  });
  return { client, bucket, publicUrl, prefix };
}

// All images are validated and re-encoded by the route before any object is written.
export async function uploadPhotosToR2(accountId: string, contents: Buffer[]): Promise<string[]> {
  const { client, bucket, publicUrl, prefix } = r2Storage();
  const keys = contents.map(() => `${prefix}/photos/${encodeURIComponent(accountId)}/${randomUUID()}.webp`);
  const attempted: string[] = [];
  try {
    for (const [index, content] of contents.entries()) {
      const key = keys[index];
      attempted.push(key);
      await client.send(new PutObjectCommand({
        Bucket: bucket, Key: key, Body: content,
        ContentType: 'image/webp', CacheControl: 'public, max-age=31536000, immutable',
      }));
    }
    return keys.map(key => `${publicUrl}/${key}`);
  } catch {
    // Include the failed request's key: R2 may have accepted it before a connection failed.
    const cleanup = await Promise.allSettled(attempted.map(Key => client.send(new DeleteObjectCommand({ Bucket: bucket, Key }))));
    if (cleanup.some(result => result.status === 'rejected')) console.error('R2 partial upload cleanup failed');
    throw new ApiError(502, 'Photo storage is temporarily unavailable. Please try again.');
  } finally {
    client.destroy();
  }
}
