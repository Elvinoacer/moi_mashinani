# Campus value workflows

Implementation of `moi_mashinani_ux_ui_value_creation_audit.md`. The app remains on Next.js 16.3.8, Prisma 7 and the existing IntaSend hosted checkout.

## Student journeys

- `/` leads with a persistent campus zone, product/service search and Open Now, Deals, Delivery, Rooms and Requests intents. It shows eight ranked listings before the merchant pitch. Live status updates and the requests widget refresh every 30 seconds while the tab is visible.
- `/search` searches visible catalog items. A budget cap and price sort compare matching, in-stock items. Paid placements remain ahead within the ranking contract; the sort label makes this explicit. Cards show the matched item and price rather than an unrelated cheap service.
- `/deals` orders unexpired deal blasts first. When fewer than six discounts exist, real catalog items at KES 300 or below fill the budget section. It does not invent stock, prices or offers. Empty categories offer a prefilled request form.
- `/requests` is public. Posting needs no account. Requests expire after seven days; an opaque receipt stored in the posting browser can close a request sooner. A contact number is optional and requires explicit consent. Public feeds omit phone numbers and management tokens. Only owners of active, claimed, verified businesses can obtain a WhatsApp response link. Closed and expired requests cannot be answered.
- Product inquiry forms immediately open WhatsApp with item, price, time, zone, name and note. The student still taps **Send** in WhatsApp. A keepalive booking log and contact event start in the background. Logging failure does not block the chat; the success view retains a direct fallback link.

## Shop and hostel supply

Two-step onboarding collects essentials and three to five priced core items, then shows a preview and trust options. Every business keeps five free public products. Templates propose real item names, never fabricated prices. Drafts stay in the current tab for 24 hours.

Shopfront sellers use public shop/signboard photos. Comrade sellers use a public product/workspace photo and a private student-ID photo, or request an in-person check. Both types can request a free ambassador visit. Uploaded student IDs are re-encoded and stored separately in PostgreSQL, served through authenticated, uncached routes. They are never R2 public gallery files or public business fields. Owners can replace private evidence from the dashboard. Field workers can review it while an authorized visit is outstanding. Admins can review it from the verification modal.

Trusted field enrollment can record an inspection without uploading identity images and does not create a redundant visit request. Abandoned staged private IDs are removed after 24 hours by plan maintenance; business deletion also removes attached private evidence.

A saved listing remains pending unless enrolled through an authorized field visit with owner consent. Ownership acceptance and public approval remain separate from a trust badge. Pro does not grant verification. Public trust shields show the actual last-check date and count of open scam reports, without exposing report details or identity evidence. The native share menu/copy fallback lets merchants share the trust link to a WhatsApp chat, bio or Status.

## Merchant dashboard

`/dashboard/<slug>` has three primary areas:

1. **My shop & prices:** live four-hour broadcasts, temporary closure, catalog, stock controls, details, photos, hours and trust sharing.
2. **Customer leads:** real metrics, timestamped contact/profile activity and selected zones where supplied, booking management and requests. Button taps measure interest, not completed sales or unique customers.
3. **Boost & upgrade:** packages, shared checkout, payment recovery and payment history.

Owner phone + password is the primary login option. Email + password remains supported. Shared business contact numbers do not identify an account; the claimed private owner phone must map to exactly one owner. Existing invitation acceptance establishes the password and verifies the recovery email once. Email magic links remain recovery; there is no invented SMS/WhatsApp OTP flow.

## Field operations

Admins appoint a separate `AMBASSADOR` account using the Field Team panel. The invitee accepts the email invitation before using `/ambassador`. That role has access to the field queue, consented photo capture, location/identity checklist and enrollment, without admin moderation, other owners' billing or dashboard permissions.

The field tool has high contrast, 16px text and 52px primary controls. Progress counts distinct businesses checked today in Africa/Nairobi. Referral links attribute enrollments to appointed, verified field accounts. Admin reporting separates attributed listings from distinct businesses field-checked. Concurrent verification attempts consume a visit only once. Pending listings still need owner acceptance and admin approval after a field check.

## Payments and alerts

| Package              | Server price | Entitlement                                                                                                              |
| -------------------- | ------------ | ------------------------------------------------------------------------------------------------------------------------ |
| Deal blast           | KES 30       | 24 hours at the top of Deals; pushes to opted-in campus accounts                                                         |
| Recommended top spot | KES 100      | Seven days above free listings in matching category/zone results                                                         |
| Pro                  | KES 250      | One calendar month of unlimited items/storage, stock controls, a quality ranking bonus and optional matching-request SMS |

Existing Featured purchases and bundle pricing continue to reconcile correctly. Historical KES 500 Pro checkouts can still complete at their original stored quote; new quotes use KES 250. Renewal preserves paid time and duplicate callbacks cannot add time twice.

`/promote/<slug>` and `/pro/<slug>` redirect to the shared dashboard checkout, including provider return payment IDs. The UI polls **provider verification**, not just the saved local state, every three seconds for up to three minutes while visible. It then offers explicit checks and the same saved checkout reference. The timer and progress steps describe what is actually known; opening hosted checkout does not prove an STK prompt was delivered.

The fallback reopens the saved provider checkout and allows a 10-character M-Pesa receipt to be saved for operator review. A receipt alone never settles a payment or activates a plan. The existing client settlement endpoint remains disabled. No unspecified manual paybill is presented.

Matching requests generate durable inbox/email/push notifications for eligible sellers. Optional Pro SMS uses Africa's Talking, requires owner opt-in and `AT_USERNAME`, `AT_API_KEY`, plus an approved `AT_SENDER_ID` where required. Delivery rechecks the owner, consent, verification and Pro term; expired/disabled targets stop. Provider acceptance is logged and retryable, without promising handset delivery. Contracts: [SMS endpoint](https://africastalkingltd.gitbooks.io/mobile-communication-apis/content/downloads.html), [acceptance versus delivery](https://help.africastalking.com/en/articles/742491-why-did-my-messages-fail).

## Deployment

Apply migration `20261014090000_campus_value_loops` before deploying code against an existing database. `npm run db:migrate` uses the configured database; production builds already apply migrations through the existing production migration script. Configure optional SMS separately. Existing Resend, R2, Firebase and IntaSend settings remain required for their respective live services.

No production deployment, actual M-Pesa charge, real SMS or external customer WhatsApp message is part of the local implementation tests.

## Verification

- `npm run test:value`: 23 passing database/API checks for phone login, permissions, request consent/redaction/expiry/closure, notifications, WhatsApp response links, live expiry, lead events, Pro stock enforcement, replay-safe micro-packages, private ID access and field progress.
- `npm run test:value:browser`: 10 passing mobile/desktop journeys for discovery, stored zones, anonymous requests, immediate WhatsApp handoff with a deliberately delayed booking log, two-step hostel preview, dashboard actions, mocked provider polling, field touch targets and empty-state recovery. No uncaught browser errors.
- `npm run test:value:unit`: two passing matched-price and WhatsApp-message checks.
- `npm run test:sms`: provider contract, acceptance validation and fail-closed configuration, using injected fetch mocks.
- Existing catalog, payment, notification, template, ranking, onboarding-integrity and workflow checks cover retained behavior.

Production verification uses `npm run build -- --webpack`: compiled successfully, completed TypeScript and generated all 51 static pages. The default Turbopack build was not used as evidence. Catalog/database regressions passed seven groups, payment route/database checks passed eight checks, ranking passed 30 checks and onboarding integrity passed three groups. Unit coverage also passed for catalog plans, payments, notifications, all 65 enrollment templates and three SMS checks.

`npm run lint` and `git diff --check` pass. These results verify implementation behavior, not adoption, sales uplift or live provider availability.

The broader HTTP workflow suite passes all 44 checks against the compiled production app, including invitation failure/recovery, ownership reassignment, single-use tokens, password reset/session revocation, upload validation and moderation. Its direct route check imports a test-only Next request scope; no application runtime fallback is introduced.

The broader browser suite also passes 10 journeys against that production build: admin enrollment, email acceptance and automatic login, profile/hours/catalog edits, live availability/closure, anonymous WhatsApp booking and owner inbox, missing-provider checkout recovery, role gates and suspension/restoration. No uncaught browser errors were observed. Together with the campus value browser suite, this verifies 20 browser journeys.

Six email contract checks and the anonymous enrollment photo upload/CSRF checks also pass with mocked providers.

The workflow harness creates and removes its own local database, captures email and object storage, and disables actual payments/SMS. Browser provider responses are mocked. It uses no external checkout charge and no production data mutation.

After building, `TEST_SERVER_MODE=production npm run test:harness` runs the compiled app against the disposable database. Its configured HTTPS invitation origin satisfies production URL validation; the loopback test transport remains HTTP, requests use the configured test origin and captured links are opened by token in the test browser. No invitation is sent externally.
