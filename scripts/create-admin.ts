import 'dotenv/config';
import { prisma } from '../src/lib/prisma';
import { normalizeEmail, hashPassword } from '../src/lib/auth';

async function main() {
  const email = normalizeEmail(process.env.ADMIN_EMAIL);
  const name = process.env.ADMIN_NAME || 'Main Administrator';
  const password = process.env.ADMIN_PASSWORD;
  if (!password) throw new Error('Set ADMIN_EMAIL and ADMIN_PASSWORD (at least 12 characters) for this command.');
  const existing = await prisma.account.findUnique({where:{email}});
  if (existing) throw new Error('An account already exists for this email. This command does not replace accounts or passwords.');
  await prisma.account.create({data:{email,name,role:'ADMIN',passwordHash:await hashPassword(password),emailVerifiedAt:new Date()}});
  console.log('Administrator created. Sign in at /login.');
}
main().catch(e=>{console.error(e.message);process.exitCode=1;}).finally(()=>prisma.$disconnect());
