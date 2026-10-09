import 'dotenv/config';
import { readdirSync } from 'node:fs';
import { prisma } from '../src/lib/prisma';
import { CATEGORIES, ZONES } from '../src/lib/constants';
import { getIntaSendConfig } from '../src/lib/intasend';
import { r2Storage } from '../src/lib/r2';

let failures = 0;
function check(label: string, valid: boolean) {
  console.log(`${valid ? 'PASS' : 'FAIL'} ${label}`);
  if (!valid) failures++;
}
async function main() {
  try {
    const url = new URL(process.env.APP_URL || '');
    check('APP_URL is a public HTTPS origin', url.protocol === 'https:' && !url.username && !url.password &&
      url.pathname === '/' && !url.search && !url.hash && !['localhost', '127.0.0.1', '::1'].includes(url.hostname));
  } catch { check('APP_URL is a public HTTPS origin', false); }
  check('Resend sender and server API key are configured', Boolean(process.env.RESEND_API_KEY?.trim() && process.env.EMAIL_FROM?.trim()));
  try { const storage = r2Storage(); storage.client.destroy(); check('R2 upload configuration is valid', true); }
  catch { check('R2 upload configuration is valid', false); }
  try { const payment = getIntaSendConfig(); check('IntaSend live checkout configuration is valid', payment.mode === 'live'); }
  catch { check('IntaSend live checkout configuration is valid', false); }
  await prisma.$transaction(async tx => {
    await tx.$executeRawUnsafe('SET TRANSACTION READ ONLY');
    const rows = await tx.$queryRaw<Array<{ migration_name: string; finished_at: Date | null; rolled_back_at: Date | null }>>`
      SELECT migration_name, finished_at, rolled_back_at FROM "_prisma_migrations"`;
    const expected = readdirSync('prisma/migrations', { withFileTypes: true }).filter(entry => entry.isDirectory()).map(entry => entry.name);
    check('All database migrations are applied', expected.every(name => rows.some(row => row.migration_name === name && row.finished_at && !row.rolled_back_at)) &&
      !rows.some(row => !row.finished_at && !row.rolled_back_at));
    check('Production categories are present', await tx.category.count({ where: { id: { in: CATEGORIES.map(item => item.id) } } }) === CATEGORIES.length);
    check('Production zones are present', await tx.zone.count({ where: { id: { in: ZONES.map(item => item.id) } } }) === ZONES.length);
    check('A verified administrator with a password exists', await tx.account.count({ where: { role: 'ADMIN', emailVerifiedAt: { not: null }, passwordHash: { not: null } } }) > 0);
  }, { maxWait: 20000, timeout: 30000 });
  console.log(failures ? `${failures} production requirement(s) still need configuration.` : 'Production configuration and database checks passed.');
  if (failures) process.exitCode = 1;
}
main().catch(() => {
  console.error('Production database verification failed. Check the connection and migration status.');
  process.exitCode = 1;
}).finally(() => prisma.$disconnect());
