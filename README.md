# MoiMashinani

Campus business discovery, field enrollment, merchant accounts and IntaSend promotion checkout.

Read the [complete platform user guide](docs/platform-user-guide.md) for all student/customer, admin and business actions, daily workflows, payments and troubleshooting.

```sh
npm install
# Configure .env from .env.example
npm run db:migrate
npm run admin:create
npm run dev
```

The administrator visits businesses, records their details/products/photos in `/admin/enroll`, and sends an email invitation. Owners verify the email, set a password, and manage their own business in the merchant dashboard. Customers discover businesses, contact them, request bookings and report issues. The admin manages approvals, reports and owner invitations.

Read [Business enrollment and account setup](docs/onboarding.md) for environment configuration, existing database baselining and administrator creation. Read [IntaSend payments](docs/payments.md) for checkout and webhook setup.

Validation:

```sh
npm run lint
npx tsc --noEmit
npm run build
npm run test:engine
npm run test:payments
```

The [isolated workflow harness](docs/onboarding.md#testing) runs PostgreSQL, HTTP, email and browser journeys with synthetic records and no external payments/emails.

See the [verification record](docs/verification.md) for tested workflows and the remaining external-service setup.
