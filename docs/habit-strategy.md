# Campus value and daily habit implementation

Implemented from `moi_mashinani_value_creation_habit_strategy.md` on 15 October 2026.

## What students can do

- Browse, search, compare prices, view deals and contact sellers without an account.
- Broadcast an **Ask Mashinani** request from the homepage. After saving, contact matching verified sellers immediately on WhatsApp or share the request in a campus group. Contact numbers remain private on the board; responding merchants need explicit student consent.
- Open `/deals`, select a campus zone and a KES 100/200 budget, and find live flash deals and delivery drops. The budget includes the advertised delivery fee. Countdown timers remove expired deals. Joining a drop records interest once per browser and opens a seller chat; the seller confirms the actual order and meeting point.
- Use blackout/backup power, live Wi-Fi, water, late opening, free delivery and verified vacant-keja filters. Power/Wi-Fi/water filters require an unexpired seller confirmation. Kejas require an L2 listing, a positive vacancy count, a listed rent and caretaker-direct/no-broker-fee details. Utility and vacancy claims are seller-reported; the profile shows water and security details.
- Browse `/market` for verified student hustles and declutter items. Post one item or service with a price, condition/details, a safe campus meeting point and a private student-ID image. Verify a phone by SMS once. Listings stay pending until identity/location review, expire after 30 days and can be marked sold out or refreshed for another 30 days from the dashboard. A storefront photo is not required.

The homepage uses **Africa/Nairobi** time for breakfast, lunch, dinner and late-campus context. It highlights real relevant listings and real offers; it does not invent deals, merchant counts or emergency telephone numbers.

## What merchants can do

Catalogue creation, all public catalogue items and stock updates are free. Verified businesses also have unlimited catalogue image storage. Unverified free listings retain the existing 25 MB upload allowance; pre-enrollment uploads remain bounded. Images are still validated and compressed, and unused objects are cleaned through the existing media ledger.

Sign in using an SMS code, or keep using accepted owner phone/email and password. A shop's public contact number is not an authentication identity. SMS verifies an account-bound phone, or upgrades a uniquely accepted, email-verified merchant owner phone. A shared owner phone with multiple accounts cannot silently select one account. Administrators/ambassadors can enroll a field-checked merchant using the owner's phone without requiring email. The merchant verifies that phone before claiming the account. Failed invitation transport is reported as a saved listing with an unsent invitation.

From the dashboard overview, save utility and caretaker details, publish a free flash deal/delivery drop, see interested customers, and end an offer early. Drop zones must be served by the business; order cutoff cannot follow the delivery time. Download the branded QR signboard from the share tools or enrollment result, and put the public storefront link in a WhatsApp bio or Status.

Opt into merchant SMS alerts in the services/trust tools. Matching requests and bookings produce scoped no-login action links. Tap to reply with a price, accept a booking and open WhatsApp, or confirm that the shop is open. Merchant actions appear in the lead timeline. Recent response speed contributes to organic quality after at least three responses; it does not replace relevance or verification.

## Trust and availability

Temporarily closed storefronts retain their public profiles with the closure notice, while new bookings and live discovery are paused.

Opening hours automatically display **Open by listed hours**. A fresh confirmation displays **Confirmed open Xm/Xh ago** and expires after four hours. Overnight schedules use Kenya time, including the previous day's overnight window. Appointment-only hours are not treated as walk-in opening hours.

Merchant quick links are cryptographically random bearer capabilities, with only their hashes stored in the action table. Their scope, owner, listing status, resource and expiry are checked at consumption. They do not grant a general dashboard session. OPEN links expire after 12 hours; request/booking links after 24 hours. They can be consumed only once, including concurrent taps. Ownership reassignment, suspension, closure of a request or cancellation of a booking invalidates the relevant action. GET previews do not mutate state; the action button sends POST. Action pages are uncached, excluded from indexing and suppress referrers. SMS delivery links go directly to the capability; a public notification ID cannot disclose it.

Phone codes expire after five minutes, lock after five wrong attempts and are consumed atomically. Codes are hashed, never returned by the public request endpoint. Student ID evidence remains in the existing private, cookie/account-scoped storage and is never part of a public catalogue or market response. A phone verification alone cannot grant an L2 badge.

## Monetization

- **Pro, KES 250/calendar month:** featured placement in relevant zone/category results and a daily broadcast of an active deal to opted-in campus accounts.
- **Recommended, KES 100/week:** existing paid placement remains available and preserves purchased time.
- **Deal blast, KES 30/24 hours:** existing promoted offer placement and opted-in notification delivery.

Payments retain server pricing and verified, replay-safe IntaSend settlement. Expiry ends visibility benefits; no catalogue item is hidden. Verification remains free and evidence-based. A Pro purchase does not grant a trust badge.

## Deployment and external services

1. Apply the additive migrations with `npm run db:migrate` before starting the new application. Generate the client with `npx prisma generate --config prisma7.config.ts` (also included in the production build script).
2. Set `APP_URL` to the public HTTPS origin. Configure `AT_USERNAME`, `AT_API_KEY` and, where required by the provider, an approved `AT_SENDER_ID` for SMS-code sign-in, field invitations and opted-in alerts. SMS sign-in reports an explicit service-unavailable error when credentials are missing; password sign-in remains available.
3. Keep the existing Resend, Firebase, R2 and IntaSend setup. Firebase push only broadcasts to opted-in campus accounts. No automated WhatsApp transport is claimed: WhatsApp opens with a prepared message and the user taps Send.
4. Configure `CRON_SECRET`, then schedule authenticated **GET `/api/cron/campus-pulse` at 07:00 Africa/Nairobi (04:00 UTC)**. It queues at most 20 morning pings per invocation and deduplicates per merchant/day; repeat for a larger merchant population. Active Pro deals get one broadcast per business/day. Keep **GET `/api/cron/notifications` every minute** for durable delivery retries and the existing catalogue-plan maintenance schedule.
5. Perform a real SMS delivery, a real Firebase push and an IntaSend sandbox checkout on the deployment before enabling live campaigns. Local tests use synthetic data and captured/mocked transport, so they cannot establish provider delivery.

The configured remote database was not migrated during implementation. The migration and all end-to-end fixtures were exercised in a disposable local PostgreSQL database.

## Verification commands

```sh
npm run lint
npx tsc --noEmit
npx next build --webpack
npm run test:catalog
npm run test:habit:unit
npm run test:sms
npm run test:payments

# Start the existing disposable workflow harness, then run:
npm run test:habit
npm run test:habit:browser
npm run test:value
```

`test:habit` exercises persisted API and authorization boundaries. `test:habit:browser` exercises homepage request escalation, timed deals and joining drops, merchant publishing, QR download, single-use open confirmation, SMS-code UI with a real verification endpoint, and one-item student posting. Test SMS transport is captured rather than sent. Mobile screenshots are written to `/tmp/mm-habit-browser`.
