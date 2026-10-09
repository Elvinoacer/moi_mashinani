# Production setup

Use the production environment's secrets store or an ignored `.env` file. Never copy credentials into committed files.

## Database preparation

`DATABASE_URL` is the PostgreSQL connection used by the application, with a maximum of 10 connections per app process and a 20-second connection timeout. The current production setup uses the verified direct Neon endpoint because pooled/serverless connections failed from the setup machine. `DATABASE_URL_UNPOOLED` is the direct connection used by Prisma migrations and introspection; local databases may leave it empty. Neon pooled connections can be used for application queries once verified in the deployment environment.

`DATABASE_IP_FAMILY=4` scopes database connections to IPv4 on the current setup machine, whose IPv6 network is unreachable. Leave it empty for automatic address selection on environments with working IPv6. TLS still verifies the database hostname.

Run these commands from the project directory:

```sh
npm ci
npm run db:migrate
npm run seed:production
```

The production seed inserts the current category catalogue and 8 zones. It preserves existing reference records and creates no businesses, customers, payments or accounts. It can be run again safely. `npm run seed` is a separate demo-data command and must not be used to populate production.

## Administrator and external services

Set `ADMIN_EMAIL`, `ADMIN_NAME` and `ADMIN_PASSWORD`, then run `npm run admin:create`. Passwords require at least 12 characters. The command refuses to replace an existing account. Remove the one-time bootstrap password from the environment after creating the administrator.

Set `APP_URL` to the public HTTPS origin, without a path. Resend uses `RESEND_API_KEY` and `EMAIL_FROM`; the sender domain must be verified in Resend. R2 uses the existing server credentials and stores photos under `moimashinani/photos/` in the shared bucket.

For live payments, use `INTASEND_MODE=live` and the matching live public/secret keys. Register `<APP_URL>/api/payments/webhook` in the matching IntaSend account with the same `INTASEND_WEBHOOK_CHALLENGE`. A configured sandbox remains a testing environment.

## Catalogue Pro and reminders

Apply the catalogue migration with `npm run db:migrate`, configure the same server-only `CRON_SECRET` in the deployed host and cron-job.org's Authorization header, and schedule `GET /api/cron/catalog-plans` every 15 minutes. No GitHub Actions or Vercel Cron configuration is needed. Pro is KES 500 per calendar month and renews only when the owner completes checkout. See [catalogue plans](catalog-plans.md) for scheduler settings, quota enforcement, expiry behavior and verification.

## Validation and startup

```sh
npm run check:production
npm run build
npm start
```

`check:production` reads the database and checks migration history, required reference data, an administrator and configuration for HTTPS, Resend, R2 and live IntaSend. It prints no credentials and makes no email, payment or storage writes. A failing check identifies an outstanding production requirement.

Verify the public URL after deployment: discovery/category/zone requests must succeed, the administrator must be able to sign in, and owner invitation links must point to the public domain. Real provider delivery and payment-webhook confirmation require the configured external accounts.

## Verified on 9 October 2026

- All three migrations applied to the production Neon database; Prisma schema diff reports no differences.
- Database contains 12 categories, 8 zones and one verified administrator. Businesses, payments and bookings are empty.
- `https://moimashinani.vercel.app/api/categories` and `/api/zones` return 200 with 12 and 8 records respectively.
- The administrator signed in successfully on the public deployment, `/api/auth/me` confirmed the administrator role, and the verification session was logged out.
- Production build, TypeScript, focused lint and the five storage tests passed.
- The one-time `ADMIN_PASSWORD` was cleared from `.env` after sign-in verification.
- The configuration check passes for the public URL, database, reference data, administrator, Resend and R2. Live IntaSend configuration remains incomplete because the payment keys are empty.
- Dependency audit reports high-severity advisories under Prisma CLI tooling (`mysql2` and `deepmerge-ts`). The app uses PostgreSQL; these are not its database transport. Resolving the tooling advisories requires a compatible Prisma/dependency update; no major downgrade or unverified override was applied.

No external email or payment was sent during these checks.
