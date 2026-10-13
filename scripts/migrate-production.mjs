// Production Vercel deployments must migrate before code referencing new tables goes live.
// Preview builds and CI must never mutate the production database.
import { execFileSync } from 'node:child_process';

if (process.env.VERCEL_ENV === 'production') {
  if (!process.env.DATABASE_URL_UNPOOLED && !process.env.DATABASE_URL) {
    throw new Error('Production migrations need DATABASE_URL_UNPOOLED or DATABASE_URL');
  }
  console.log('Applying pending production Prisma migrations before building…');
  execFileSync(process.execPath, ['node_modules/prisma/build/index.js','migrate','deploy','--config','prisma7.config.ts'], {stdio:'inherit'});
} else {
  console.log('Skipping production migration for non-production build.');
}
