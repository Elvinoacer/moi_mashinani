# Workflow verification

Verified locally on 9 October 2026 against Next.js 16.3.8 and PostgreSQL. HTTP, SMTP and browser fixtures ran in a disposable database. Existing business data was preserved; its database received only the three schema migrations and still contains 12 businesses and no bootstrapped real accounts.

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

Email delivery was verified through a local SMTP capture server. IntaSend tests use mocked provider transport with actual route handlers and PostgreSQL transactions. No external emails or payment charges were made. These checks establish application behavior, but cannot establish delivery through a real SMTP account or IntaSend account.

To operate the deployment, configure SMTP and IntaSend environment variables, bootstrap the main administrator with `npm run admin:create`, and register the HTTPS collection webhook. Then complete an IntaSend sandbox checkout and confirm its delivered webhook, stored receipt and promotion dates on that deployment before enabling live collections. See [account setup](onboarding.md) and [payment setup](payments.md).
