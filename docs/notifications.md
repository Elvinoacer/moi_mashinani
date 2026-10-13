# Notifications

**Owner verification is required for browser push registration.** Anonymous enrollment no longer sets a device binding cookie for an account whose email was only supplied in a public form. This prevents a third party from subscribing to someone else's business notifications. The owner verifies the email invitation and signs in before enabling push notifications.

MoiMashinani saves critical events into an account inbox and a per-channel delivery outbox in the same transaction as the business change. Email uses the existing Resend integration. Push uses Firebase Cloud Messaging with the Web SDK and server-only Admin SDK.

## Covered events

| Event | Recipients | Destination |
| --- | --- | --- |
| New listing / field enrollment | Admins and owner | Admin moderation / owner accounts / business dashboard |
| Approval, rejection, suspension, restoration | Owner | Business dashboard Photos tab; approval asks for profile, shop and product photos |
| Verified badge added or removed | Owner | Business dashboard |
| Email verified / password reset | Account owner | Business Billing tab |
| New service demand / suggestion | Admins | Admin requests |
| Complaint filed / reviewed | Admins | Admin moderation |
| Suspension after complaint | Owner | Business dashboard |
| New booking / product inquiry | Owner, admins, signed-in requester | Business Bookings tab (also accessible to admins); requester inbox |
| Booking confirmed, completed, cancelled or reopened | Owner, admins, signed-in requester | Business Bookings tab / requester inbox |
| Verified payment and plan activation | Owner and admins | Business Billing tab |
| Failed / cancelled payment | Owner | Business Billing tab |
| Pro reminder at 7, 3, 1 days and expiry | Owner | Pro renewal; existing reminder email plus inbox/push |

Suggestions currently use `/api/demand`. Product inquiries use `/api/bookings`. There is no independent order/fulfillment workflow in this repository. Calls and WhatsApp messages leave the site, so the app cannot observe orders placed there. Anonymous customers provide a phone number, not an authenticated email: they cannot receive account email or push status updates. A signed-in requester is associated with their booking on submission.

Complaints stay private during investigation; owners receive moderation decisions, not complainant identity or unreviewed allegations.

## Firebase setup

1. Create/select a Firebase project and register a Web app. Copy the public web configuration into the `NEXT_PUBLIC_FIREBASE_*` values in `.env.example`.
2. Enable the Firebase Cloud Messaging HTTP v1 API. In Project settings → Cloud Messaging → Web Push certificates, generate the VAPID key pair and copy the **public** key into `NEXT_PUBLIC_FIREBASE_VAPID_KEY`.
3. Generate a service-account private key with Cloud Messaging send permission. Set `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, and `FIREBASE_PRIVATE_KEY` on the server. Never prefix these credentials with `NEXT_PUBLIC_`. A quoted private key with literal `\n` is supported. Client and server project IDs must match.
4. Configure existing `APP_URL`, `RESEND_API_KEY`, `EMAIL_FROM` with a verified sending domain, and a long random `CRON_SECRET`. Production needs HTTPS.
5. Run `npm run db:migrate`, then rebuild/restart the app. The inbox tables must exist before this release serves traffic. This migration is additive.
6. Schedule authenticated `GET /api/cron/notifications` every minute with `Authorization: Bearer <CRON_SECRET>`. Keep the existing `/api/cron/catalog-plans` schedule. Do not put the secret in the URL. No scheduler is provisioned by this change.
7. Sign in as an admin and owner, enable device alerts, approve a test listing, and create/update a test booking. Verify browser-closed push, foreground alert, email button, expired-session login redirect and account inbox. Test denial, postponement, logout and a second device.

Push prompts stay hidden until both client and server Firebase configuration are present. Email and the inbox continue independently. Email provider acceptance and Firebase acceptance do not guarantee a delivered/read notification.

## Consent and device lifecycle

- Automatic contextual prompts appear after public enrollment, on the admin dashboard and on the business dashboard after login/verification. Dashboard prompts wait four seconds; the enrollment prompt appears after submission. Automatic prompts avoid another modal or an active form field.
- Browser permission is requested only from the Allow button. Closing or choosing Maybe later postpones the next automatic prompt for seven days and the rest of the current visit. No thanks or a browser denial stops automatic prompts. The inbox contains an explicit opt-in control to reconsider.
- iPhone/iPad web push requires a supported browser and opening the installed Home Screen app. Unsupported contexts do not receive automatic prompts.
- Tokens are authenticated through the server session or a random HttpOnly enrollment capability. The latter is valid for registration for 24 hours and restricted to that submitted business's listing decisions. It cannot subscribe to the owner's other account events or read their inbox.
- Token registration checks length/format and Firebase dry-run validation for a new token. Account IDs are derived by the server. Tokens are unique; browser account switching invalidates prior bindings. Devices refresh on visits/day and new login; expired tokens are removed following Firebase errors.
- Logout disables the current browser binding. Password reset disables all bindings for that account. Devices inactive for 30 days are excluded from sends; tokens inactive for 90 days are cleared. Revisit and opt in to reactivate.
- Foreground alerts re-check inbox ownership. Background alerts contain a generic body without customer names, phone numbers or complaint details. Clicks use `/notifications/open/:id`, enforce account ownership, and route through login with a safe return path.

## Delivery and operations

Every recipient has one inbox item per event key. Each email/device has an independent delivery record, so a successful email does not block retrying failed push or vice versa. A five-minute claim lease handles crashed workers and concurrent schedulers; retry backoff grows from two minutes up to six hours. After ten failures, a delivery stops for operator review. Invalid Firebase tokens stop immediately. Inbox items remain even when both channels fail.

After-response dispatch handles normal sends promptly. The authenticated cron is required for backlog/retries. `GET /api/admin/notifications` reports pending/stopped counts and sanitized failures; `POST` with `{ "id": "delivery-id" }` requeues a stopped email or an active push device. Admins also have delivery health/retry controls in their notification inbox. Successful deliveries cannot be requeued.

Resend uses a stable idempotency key per delivery (the provider's deduplication window is 24 hours). Push is at-least-once; an ambiguous network timeout/crash can lead to another send. Service worker tags keep repeated banners for an inbox item together. Do not claim exactly-once delivery. Notification contents and tokens live only in the application database; the Firebase project is used for transport. Transactional service emails do not depend on push consent.

Verification and password-reset invitations retain their existing token security and manual resend behavior. All emails now have branded HTML buttons; plaintext alternatives include accessible fallback URLs.

## Verification

`npm run test:notifications` covers consent timing, escaped email buttons, safe destinations and foreground/background service-worker behavior. With the isolated `npm run test:harness` running, `npm run test:notifications:workflows` covers event persistence, role isolation, login return paths, booking status updates, per-channel failure/retry, and expired-token cleanup. `npm run test:notifications:browser` checks mobile consent, snooze, decline and inbox controls without requesting real Firebase permission. SDK sends and Resend are mocked in these tests. Real-device validation still requires the configured Firebase project.
