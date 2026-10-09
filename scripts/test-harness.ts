import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import { spawn } from 'node:child_process';
import { readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import { Client } from 'pg';
import { resolve } from 'node:path';

const contextPath = '/tmp/moimashinani-test-context.json';
const mailPath = '/tmp/moimashinani-test-mail.json';
const dbName = `moimashinani_e2e_${randomUUID().replaceAll('-','')}`;
const url = new URL(process.env.DATABASE_URL!);
const originalUrl = url.toString(); url.pathname = `/${dbName}`;
const databaseUrl = url.toString();
const admin = {email:'admin@test.invalid',password:'test admin password 2026'};
let server: ReturnType<typeof spawn> | undefined;
async function command(args:string[],env:NodeJS.ProcessEnv) {
  const child = spawn(process.execPath,args,{env,stdio:'inherit'});
  await new Promise<void>((resolve,reject)=>child.once('exit',code=>code===0?resolve():reject(new Error(`Command exited ${code}`))));
}
const control = new Client({connectionString:originalUrl});
let shuttingDown=false;
async function shutdown(exitCode = 0) {
  if (shuttingDown) return; shuttingDown=true;
  server?.kill('SIGTERM');
  await new Promise(resolve=>setTimeout(resolve,1500));
  try { await control.query(`DROP DATABASE IF EXISTS "${dbName}" WITH (FORCE)`); } finally { await control.end(); }
  try {
    // Remove this harness's credentials and captured links, while preserving
    // context from any newer harness that may have taken its place.
    if (JSON.parse(readFileSync(contextPath,'utf8')).databaseUrl === databaseUrl) {
      unlinkSync(contextPath); unlinkSync(mailPath);
    }
  } catch { /* Context may not have been written if setup failed. */ }
  console.log('Isolated workflow database removed.');process.exit(exitCode);
}
process.once('SIGINT',()=>void shutdown());process.once('SIGTERM',()=>void shutdown());
async function main() {
  await control.connect(); await control.query(`CREATE DATABASE "${dbName}"`);
  const env: NodeJS.ProcessEnv = {...process.env,DATABASE_URL:databaseUrl,APP_URL:'http://127.0.0.1:3100',RESEND_API_KEY:'re_test_harness',EMAIL_FROM:'MoiMashinani Test <accounts@test.invalid>',NEXT_DIST_DIR:'.next-test',INTASEND_PUBLIC_KEY:'',INTASEND_SECRET_KEY:'',INTASEND_WEBHOOK_CHALLENGE:'',ADMIN_EMAIL:admin.email,ADMIN_PASSWORD:admin.password,NODE_ENV:'development'};
  await command(['node_modules/prisma/build/index.js','migrate','deploy','--config','prisma7.config.ts'],env);
  await command(['node_modules/tsx/dist/cli.mjs','prisma/seed.ts'],env);
  await command(['node_modules/tsx/dist/cli.mjs','scripts/create-admin.ts'],env);
  writeFileSync(contextPath,JSON.stringify({databaseUrl,baseUrl:env.APP_URL,admin,mailPath},null,2),{mode:0o600});
  writeFileSync(mailPath,'[]',{mode:0o600});
  const runningServer = spawn(process.execPath,['--import',resolve('scripts/mock-resend.mjs'),'node_modules/next/dist/bin/next','dev','--hostname','127.0.0.1','--port','3100'],{env,stdio:'inherit'});
  server = runningServer;
  runningServer.once('exit',code=>void shutdown(code ? 1 : 0));
  console.log('Workflow harness context ready at '+contextPath);
}
main().catch(async error=>{console.error(error);await shutdown(1);});
