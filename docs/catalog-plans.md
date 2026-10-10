# Catalogue plans

| Feature                    | Free                                 | Pro                                  |
| -------------------------- | ------------------------------------ | ------------------------------------ |
| Price                      | KES 0                                | KES 500 per calendar month           |
| Public products/services   | 5                                    | Unlimited                            |
| Total hosted image storage | 25 MB per business                   | Unlimited                            |
| Shop gallery               | 8 photos                             | 8 photos                             |
| Source image size          | 5 MB per image                       | 5 MB per image                       |
| Stored image size          | Up to 1 MB, automatically compressed | Up to 1 MB, automatically compressed |
| Promotion/ranking          | Purchased separately                 | Purchased separately                 |

A product and a service each occupy one catalogue slot. Images are rotated, resized to at most 1600px and re-encoded as WebP without EXIF metadata. Browsers compress before uploading and send batches of at most three images, keeping requests below Vercel's 4.5 MB request-body limit. The server independently validates and compresses every image.

## Billing and expiry

`/pro/<business-slug>` compares plans, starts an IntaSend hosted checkout and checks payment status. Price and duration are calculated on the server. Verified payment activates the separate `proStartsAt`/`proEndsAt` entitlement atomically; duplicate callbacks cannot grant duplicate months. Early renewal adds a calendar month after the existing end. Late renewal starts a new month at payment verification. Month-end dates are clamped to the last day of the next month.

Pro never auto-renews. It has no mandate or automatic charge. Owners must open the checkout page and make a fresh one-time payment. Pro does not grant Recommended or Featured promotion.

At the exact end time, server checks return the business to Free. The first five products stay public; extras stay saved and can be edited, removed or moved into the visible five using **Show on Free**. Public search and bookings also obey the five-item limit. Existing photos and extra products are not automatically deleted. Owners over 25 MB must remove photos or renew before adding new hosted images.

## Storage accounting

`BusinessMedia` records the compressed bytes of every new upload. Reservations count before writing to R2 and are serialized under the business lock, so concurrent requests cannot overrun Free's quota. Administrators' pre-enrollment uploads use a separate 25 MB staging allocation; attaching them during enrollment transfers them to that business's allocation.

New hosted URLs must belong to the current business or its authenticated uploader's staging area. Photo deletion checks all gallery, cover and product references before deleting an object. Removed tracked photos release their allocation only after R2 confirms deletion. Failed deletion is retried by the scheduled job. Unreferenced uploads older than 24 hours are cleaned up; photos referenced by saved, expired-Pro products are retained.

Old images predate byte accounting. Each existing hosted image without a ledger entry conservatively reserves 5 MB. The dashboard explains this estimate; replacing it with a compressed upload switches to exact byte accounting. Third-party image links do not consume this app's hosted storage. The legacy PostgreSQL upload endpoint remains readable.

## Reminder job

`GET /api/cron/catalog-plans` is triggered by **cron-job.org**, without GitHub Actions or Vercel Cron. Configure a strong server-only `CRON_SECRET` in the deployment; the endpoint requires `Authorization: Bearer <CRON_SECRET>`. The local `.env` stores the generated secret and is excluded from Git. `APP_URL`, `RESEND_API_KEY` and `EMAIL_FROM` must also be configured, with a verified Resend sender.

Create a job at <https://console.cron-job.org/jobs> with:

| Setting                             | Value                                                                                                |
| ----------------------------------- | ---------------------------------------------------------------------------------------------------- |
| Title                               | MoiMashinani plan reminders and media cleanup                                                        |
| URL                                 | `https://moimashinani.gtss.software/api/cron/catalog-plans` (use your deployed origin if it changes) |
| Method                              | GET                                                                                                  |
| Schedule                            | Every 15 minutes, every day                                                                          |
| Time zone                           | Africa/Nairobi                                                                                       |
| Custom header name                  | `Authorization`                                                                                      |
| Custom header value                 | `Bearer ` followed by the **unquoted** `CRON_SECRET` value from `.env`                               |
| Request body / basic authentication | None                                                                                                 |
| Notifications                       | Enable failures, recovery and automatic job-disable notifications                                    |

Keep the secret out of URL query parameters, screenshots and source control. Set the same value as `CRON_SECRET` in the **production host's environment**, then redeploy/restart; editing local `.env` does not update Vercel. The endpoint must be publicly reachable by cron-job.org, with its own Bearer authentication. Test the job after deploying. A healthy run returns HTTP 200 and a compact JSON summary. HTTP 401 means the header does not match; HTTP 503 reports missing configuration or provider delivery/cleanup failures. HTTP 404 means the route has not been deployed to that URL.

cron-job.org's standard timeout is 30 seconds. Each endpoint call processes at most 10 reminders and 10 cleanup candidates with a 15-second work budget, a 20-second provider cancellation deadline and a 25-second host duration. Later calls continue unsent notices and uncleaned uploads. Reminder provider requests have a five-second individual timeout; failures remain retryable. Database/host outages can still cause a timeout, which the scheduler's failure notification should flag. See the [cron-job.org FAQ](https://cron-job.org/en/faq/) for timeout, custom-header and notification support.

Owners receive email at the 7-, 3- and 1-day thresholds and once after expiry. A missed run sends the closest applicable notice rather than a backlog of stale notices. Reminder links lead to `/pro/<slug>`, where the owner chooses whether to proceed to checkout. The dashboard independently warns during the last seven days even if email is unavailable.

`PlanNotice` deduplicates each business/end-date/reminder stage, leases concurrent deliveries, retries provider failures and uses Resend's idempotency key. Renewal changes the end date, suppressing reminders for the old period. Failed email or object cleanup returns 503 from the job so scheduler monitoring can flag it.

## Rollout

1. Run `npm run db:migrate` to apply `20261010010000_catalog_pro`. It only adds nullable plan dates and new accounting/reminder tables; existing business data is preserved.
2. Configure `CRON_SECRET`, the Resend variables and existing IntaSend/R2 credentials in the deployment.
3. Deploy the application, configure the cron-job.org job above, and alert on failed requests. No `vercel.json` cron entry or GitHub workflow is required.
4. Verify a real sandbox checkout and provider callback using test credentials before switching to live payments. Automated tests mock all provider writes.

## Tests

`npm run test:catalog` covers calendar boundaries, expiry, saved products, reminder thresholds and reminder email contracts. `npm run test:payments`, `npm run test:r2` and `npm run test:mail` cover existing provider integrations.

`npm run test:catalog:db` requires a disposable **local** database whose name ends in `_catalog_test`; it refuses remote databases and resets that test database. It covers route authorization, concurrent product writes and byte reservations, Pro checkout pricing, verified activation/replay, renewal, expiry, photo deletion and reminder delivery/retries with mocked IntaSend/R2/email. It leaves synthetic browser fixtures and a private context file at `/tmp/moimashinani-catalog-context.json`; remove the disposable database and context after browser checks.

`npm run test:catalog:browser` uses those synthetic fixtures and a local server at `http://127.0.0.1:3101`. It checks Free/Pro/expired dashboard states, selecting the five public products, mobile checkout, and client image compression. Upload and payment provider requests are intercepted; no real purchase or provider write occurs.

`npm run test:uploads:browser` checks the shared upload UI (validation, transport progress, server processing, upload retry and save retry) and public booking from the homepage, search and mobile profiles. Run it against the same disposable local fixtures/server after `test:catalog:db`. The test uses a local mock upload provider; student bookings and gallery/item saves go into the disposable database, never production. It also checks the owner can read the saved booking.

## Removing products and photos

Removing a product, replacing its photo, or removing a gallery/cover photo queues unused media for deletion in the same database transaction as the edit. Cleanup then deletes the R2 object and releases its tracked storage allocation. Older R2 uploads are added to the cleanup ledger; older database-backed photos are deleted from `UploadedPhoto`. External image URLs are not owned by this application and are not deleted.

Photos referenced by any remaining product, gallery or cover are kept until the final reference is removed, including older photos shared across businesses. Failed cloud deletions remain in `DELETING` state and continue counting toward storage until deletion succeeds. The existing authenticated `/api/cron/catalog-plans` job prioritizes queued deletions immediately, without the 24-hour abandoned-upload waiting period. Ensure that the cron-job.org job is active in production; no additional GitHub configuration is needed.

Edit responses include `mediaCleanup` counts (`deleted`, `pending`, `retained`). Direct draft-photo deletion returns HTTP 202 with `pending: true` when cleanup is queued, HTTP 409 for a still-referenced photo, and HTTP 403 for another owner's media. Dashboard and enrollment screens display deletion progress, pending cleanup, and failures. This change requires deployment but no additional database migration.
