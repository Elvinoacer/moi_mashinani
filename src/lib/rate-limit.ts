import { createHash } from 'node:crypto';
import { prisma } from './prisma';
import { ApiError } from './api';

export async function rateLimit(req: Request, scope: string, limit = 20, seconds = 900, identity?: string) {
  // The proxy must replace (not append) X-Forwarded-For in production.
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'local';
  const key = createHash('sha256').update(`${scope}:${identity || ip}`).digest('hex');
  const now = new Date();
  const until = new Date(now.getTime() + seconds * 1000);
  const rows = await prisma.$queryRaw<Array<{count: number}>>`
    INSERT INTO "RequestLimit" ("key", "count", "resetsAt") VALUES (${key}, 1, ${until})
    ON CONFLICT ("key") DO UPDATE SET
      "count" = CASE WHEN "RequestLimit"."resetsAt" <= ${now} THEN 1 ELSE "RequestLimit"."count" + 1 END,
      "resetsAt" = CASE WHEN "RequestLimit"."resetsAt" <= ${now} THEN ${until} ELSE "RequestLimit"."resetsAt" END
    RETURNING "count"`;
  if (rows[0].count > limit) throw new ApiError(429, 'Too many requests. Please try again later.');
}
