# Workflow verification

Verified locally on 9 October 2026 against Next.js 16.3.8 and PostgreSQL. HTTP, captured-email and browser fixtures ran in a disposable database. Existing business data was preserved; its database received only the three schema migrations and still contains 12 businesses and no bootstrapped real accounts.

| Check | Result | Coverage |
| --- | --- | --- |
| Production build | Passed | All application routes compile and TypeScript checks pass. |
| ESLint | Passed | Application and verification scripts. |
| Schema drift | None | PostgreSQL matches `prisma/schema.prisma`. |
| Discovery engine | Passed | Relevance, paid placement expiry, pricing, GPS and availability expiry. |
| PostgreSQL operations | Passed | CRUD, persisted customer records, atomic promotion activation, concurrent confirmation and cleanup. |
| HTTP workflows | 37 passed | Enrollment, owner access, email verification/reset, photos, editing, map pins, availability, bookings, reports, demand and moderation. |
| IntaSend contract tests | 15 passed | Exact amounts, environment validation, hosted URL validation, retries, invoice matching and completion/replay handling. |
| Payment routes with PostgreSQL | 8 passed | Authorization, server pricing, webhook challenge, forged success, amount mismatch, concurrent verification and late failure replay. |
| Desktop/mobile browser journeys | 10 passed | Admin enrollment/photo upload, email verification/login, owner editing/hours/products/availability, customer booking, owner inbox, checkout errors, role gates and admin suspension/restoration. |

The browser checks use Chromium, include a 390px mobile viewport and check for uncaught browser errors. Screenshots are generated under `/tmp/moimashinani-browser` when the suite runs. Repeated test runs use distinct synthetic client addresses so they do not consume another run's abuse-prevention limits.

Corrections include unauthorized business/admin access, client-controlled payment settlement, false submission success, unavailable booking inboxes, lost metrics increments, search loading errors, fake location/photo defaults, cover-photo ordering, map-pin removal, lost rejection reasons, report resolution state and absent admin restore controls.

## External services still to verify

The original email workflow was verified with a local capture fixture. The Resend migration has separate mocked API contract tests (`npm run test:mail`); live Resend delivery has not been exercised. IntaSend tests use mocked provider transport with actual route handlers and PostgreSQL transactions. No external emails or payment charges were made. These checks establish application behavior, but cannot establish delivery through a real Resend account or IntaSend account.

To operate the deployment, configure Resend and IntaSend environment variables, bootstrap the main administrator with `npm run admin:create`, and register the HTTPS collection webhook. Then complete an IntaSend sandbox checkout and confirm its delivered webhook, stored receipt and promotion dates on that deployment before enabling live collections. See [account setup](onboarding.md) and [payment setup](payments.md).

## Campus habit strategy — 15 October 2026

The value-creation strategy is implemented across the homepage, free catalogues, merchant dashboard, deals/delivery drops, student market, SMS-code sign-in and no-login merchant actions. See [implementation and deployment instructions](habit-strategy.md).

Verified using disposable local PostgreSQL databases and Chromium, with synthetic records and captured/mocked external transport:

| Check | Result | Evidence |
| --- | --- | --- |
| Production build, TypeScript and lint | Passed | Next.js production compilation, static generation, TypeScript and ESLint. |
| New strategy API workflows | 33 passed | Free catalogue/stock, request escalation, action preview/replay/concurrency, availability and utility expiry, drop joins, booking acceptance, closure, phone codes, private student IDs, publication/renewal, phone-only field enrollment and cron deduplication. |
| New strategy browser journeys | 7 passed | Mobile request, deal budget/drop handoff, merchant publishing, QR download, no-login open confirmation, SMS-code UI and private-ID student posting. |
| Habit logic | 7 passed | Kenya-time hours, overnight opening, campus context, utilities, kejas, student expiry, temporary closure and honest legacy availability labels. |
| Existing value-loop workflows | 23 passed | Owner access, request privacy/closure, field verification, payments, leads and evidence. |
| Catalogue PostgreSQL regressions | Passed | Unlimited free products, concurrent edits, payment replay, photo ownership/compression/quota, shared media and durable cleanup/reminders. |
| Catalogue unit checks | 5 passed | Month renewal, expiry and public supply, reminders and cron authentication. |
| Provider contracts | 30 passed | 15 payments, 3 SMS, 6 mail and 6 notification checks; no live charges or messages. |
| Search/discovery engine | Passed | Existing relevance, promotion expiry, seeded location data and availability checks against the test database. |
| SEO | 8 passed | Metadata, sitemap, category groups, schemas and request-scoped Next.js metadata generation. |
| Schema consistency | No drift | All ten migrations applied in a disposable database; Prisma diff returned an empty migration. |

Mobile screenshots are in `/tmp/mm-habit-browser`. A separate layout check confirmed that the homepage request input uses 316 px of a 390 px viewport after stacking the input and button on small screens. The QR signboard was also rendered and visually inspected.

These checks do not establish real SMS/FCM delivery, production cron scheduling or live payment activation. The configured remote database was not migrated and the application was not deployed as part of this work.
