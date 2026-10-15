# Current onboarding

The current two-step flow, hostel-seller evidence and field roles are documented in [Campus value workflows](value-creation.md). The remaining sections describe the underlying ownership/media contracts.

# Business enrollment and accounts
## Guided enrollment

`/onboard`, `/admin/enroll` and the appointed ambassador field tool share two steps: **Essentials & prices → Preview & trust**. The first step collects the business name, category, WhatsApp, campus zone, owner name and a required owner email, with an optional separate contact phone. Owners select three to five core items and enter prices. Category templates suggest names, not prices or unverified claims. Prices can be edited later in the merchant dashboard.

The second step previews the actual items and prices, collects a landmark or safe hostel meeting point, offers hours presets and delivery, and lets the seller upload public shop/product photos or request a free field visit. Comrade sellers upload a private student ID plus a public product/workspace photo, or request an in-person identity check. A trust badge is awarded from evidence, independently of paid plans.

## Media and drafts

Public gallery uploads before invitation acceptance use `/api/enrollment/media` and an unpredictable HttpOnly, SameSite cookie. Photos are resized, re-encoded, stripped of metadata and staged for 24 hours, with file-count and 25 MB limits. Enrollment transfers the cookie-bound images to the business ownership ledger in the same transaction; entering an email never grants access to another browser’s uploads. R2 is required for public gallery storage. Product photos can be added from the owner dashboard.

Private student IDs use `/api/enrollment/proof`, separate PostgreSQL storage and authenticated, uncached retrieval. They never become public gallery URLs. Owners and admins can review them; appointed field workers can review a business’s ID while an authorized visit is pending. Abandoned staged proof is removed after the 24-hour window by plan maintenance. Attached evidence remains private and is removed when replaced or when the listing is deleted.

Drafts stay in the current tab for 24 hours. An active staging cookie is required to attach restored images. Listing submission is online; owners accept their email invitation to set a password, or sign up first with email and password, verify their inbox, then enroll while signed in. Phone and WhatsApp numbers remain contact details, not credentials.

## Operator flow

1. Sign in as the main administrator and open **Admin → Enroll business** (`/admin/enroll`).
2. During the visit, collect the owner's name and email, business name/category, description, phone/WhatsApp, area, landmark and opening hours. Add a few products/services and prices. Capture the real location while standing at the shop if desired.
3. Take or upload up to eight place/product photos (5 MB each), select a cover and assign product photos. The server validates and re-encodes photos as WebP, strips EXIF metadata and uploads them to Cloudflare R2 under the dedicated `moimashinani/photos/` folder in the configured bucket. PostgreSQL stores the photo URLs; existing database-backed photos remain accessible.
   The shared upload panel shows queued file names, preparation, upload progress, server processing and errors with retry/cancel controls. An uploaded enrollment or product photo still needs the form/item saved; gallery uploads explicitly confirm when the listing save succeeds. Failed gallery saves retry without sending the image again.
4. Confirm that the premises were inspected, the public contact details are accurate and the owner authorized publication. Submit. An administrator-enrolled listing is published as field verified, while ownership remains unclaimed until the owner explicitly accepts its invitation. A public self-registration stays pending for administrator review. Duplicate shop submissions are blocked.
5. The owner receives a one-use email link valid for 24 hours. They set a password (12–128 characters) and are signed into their dashboard. For another business added to an existing account, they enter their existing password.
6. Owners can update business details, products, photos and hours; set availability/closure; manage customer booking requests; and purchase promotion through IntaSend. Private records and modifications are restricted to that owner or an administrator.
7. In the admin console's owner accounts queue, check email delivery/verification and resend an invitation if necessary. Failed email delivery preserves the business and displays an actionable error.

The admin All listings queue supports suspending/restoring listings, recording evidence for field verification and viewing its audit history. The Owner Accounts queue now supports correcting an erroneous owner email by issuing a new invitation and revoking the previous association. Rejection reasons persist and are visible to the owner. After fixing a rejection, owners can resubmit for review from their dashboard.

Account verification accepts only the business named in that invitation: generic password resets cannot silently claim other businesses. Approval of public registrations requires accepted ownership. Editing an existing verified listing's business identity, contact information or map pin removes its field-verified status until rechecked. Listing approval and field verification are separate actions. Public visitors cannot view suspended/pending/rejected profiles, owner emails, claim codes, payment history, customer inboxes or analytics.

## Initial setup

See [production setup](production.md) for the Neon pooled/direct connections, reference-only production seed and readiness checks. A new production database needs `npm run db:migrate` followed by `npm run seed:production`; do not run the demo seed against production.

Copy `.env.example` to your environment and supply `DATABASE_URL`, `APP_URL`, `RESEND_API_KEY` and `EMAIL_FROM`. SMS is no longer used for sign-in, invitations, or notices. Email delivery must be configured for new signups. Use a sender whose domain is verified in Resend. All email requests use the Resend HTTPS API. `APP_URL` must be the public HTTPS origin for email/payment return links.

Configure the server-only `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`, `R2_ENDPOINT` and `R2_PUBLIC_URL`. Set `R2_KEY_PREFIX=moimashinani` to keep this app’s media separate in the shared `gtss` bucket. New image keys are `moimashinani/photos/<account-id>/<uuid>.webp`. `NEXT_PUBLIC_R2_PUBLIC_URL` may mirror the public URL; credentials must never use the `NEXT_PUBLIC_` prefix. Enable public reads for the configured URL. Uploads go through the authenticated app server, so browser upload CORS rules are unnecessary. Missing R2 configuration returns 503; failed writes return 502 and attempt to remove partial uploads.

The legacy `/api/uploads/<id>` route still serves photos already stored in PostgreSQL. Existing photos are not automatically migrated. Removing a tracked photo deletes its object when no gallery, cover or product still references it. Legacy images remain readable; see [catalogue plans](catalog-plans.md) for accounting and quotas.

Run `npm run db:migrate`. On a **previously provisioned database without Prisma migration history**, first baseline its original schema:

```sh
npx prisma migrate resolve --config prisma7.config.ts --applied 20261009000000_baseline
npm run db:migrate
```

Only baseline databases that already contain the original Business, PaymentRecord, BookingIntent, ProblemReport, ServiceRequest, Category and Zone tables. An empty database needs only `npm run db:migrate`. The local existing database has already been baselined and migrated without reseeding.

Set `ADMIN_EMAIL`, `ADMIN_NAME` and `ADMIN_PASSWORD` in your local secret environment, then run `npm run admin:create`. The command refuses to overwrite an existing account. Remove `ADMIN_PASSWORD` after bootstrap. Sign in at `/login`. Administrator creation is a CLI operation; public registration cannot grant the role.

There is no preconfigured real administrator or live email provider. The development seed adds demo fixtures only when missing and refuses production execution. It does not reset existing business records.

## Testing

`npm run test:payments` runs provider contract tests with mocked IntaSend responses. `npm run test:engine` checks discovery/ranking and pricing. `npm run test:db` exercises PostgreSQL CRUD, atomic promotion activation and replay protection; it creates and removes its own temporary records and expects the demo fixture businesses to exist.

For isolated HTTP and browser checks, start `npm run test:harness`. It creates a disposable PostgreSQL database, applies the migrations, adds demo data and a synthetic administrator, captures email requests through a mocked Resend API, and starts Next.js on `http://127.0.0.1:3100`. It requires database creation permission and free port 3100. It stores test-only context under `/tmp`; it does not modify `.env`, send external emails or contact IntaSend.

In another terminal run:

```sh
npm run test:workflows
npm run test:metrics
npm run test:payment-routes
npx playwright install chromium
npm run test:browser
```

Stop the harness with Ctrl+C to remove its database. Browser screenshots are written to `/tmp/moimashinani-browser`. The payment route test calls actual route handlers and PostgreSQL with a mocked provider transport, covering checkout pricing, auth, webhook challenge, invoice mismatches, concurrent delivery and replay. Live IntaSend keys and a registered HTTPS webhook are needed for a real provider delivery test; see [payments.md](payments.md).

### R2 storage checks

Run `npm run test:r2` for isolated upload-handler and storage tests (mocked database/storage; no external writes). Run `npm run test:r2:live` to upload one small temporary WebP to the configured R2 bucket, verify its public URL and remove it. HTTP/browser workflow photo checks also use the configured R2 service; use a separate `R2_KEY_PREFIX=moimashinani/test-runs` when running those checks. Their gallery objects are retained until explicitly cleaned up.

### Resend email checks

Run `npm run test:mail` for mocked Resend contract checks: verification and reset messages, sender/authentication, missing configuration, provider rejection, missing acceptance IDs and network failure handling. The workflow harness preloads `scripts/mock-resend.mjs` with a synthetic API key; it captures email text locally and never sends external email.
