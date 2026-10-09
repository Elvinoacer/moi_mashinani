# IntaSend payments

Business promotion uses IntaSend hosted checkout. Prices are calculated by the server: Recommended KES 100/week and Featured KES 200/week, for 1, 2 or 4 weeks. Upgrades buy the chosen duration from confirmation; a renewal of the same tier extends its expiry. Payments are one-time, with no automatic debit or prorated credit.

## Configure

Set `APP_URL` to the public HTTPS origin. IntaSend requires HTTPS return and webhook URLs in both sandbox and live mode. Set `INTASEND_MODE=sandbox` or `live`, `INTASEND_PUBLIC_KEY`, `INTASEND_SECRET_KEY`, and a strong random `INTASEND_WEBHOOK_CHALLENGE`. The key prefixes must match the chosen environment. Secrets stay in server environment variables.

In the corresponding IntaSend dashboard, open Settings → Webhooks → New, set the endpoint to `https://YOUR-DOMAIN/api/payments/webhook`, enter the identical challenge value, and subscribe to `collection_event`. Configure who pays collection fees as appropriate; checkout requests explicitly choose BUSINESS-PAYS so the quoted gross amount is exact.

## Verification and recovery

1. A signed-in owner or administrator starts a server-priced payment; only approved listings can purchase promotion.
2. The server persists its unique reference before requesting checkout, and uses `unique_api_ref=true`. Owners are redirected to the provider URL. No M-Pesa PIN is collected by this application.
3. The webhook validates the configured challenge, then asks IntaSend's authenticated payment-status endpoint for the invoice. The invoice ID, reference, KES currency and gross amount must match the persisted record. Only COMPLETE grants a promotion.
4. The database transaction records verified completion and updates the business tier together. Duplicate or concurrent events activate the payment once. Later failure events cannot undo completion.
5. The return page displays persisted payment status. A return redirect by itself never counts as payment. The owner can explicitly check status or reopen the same checkout.
6. If checkout creation times out, retry `/api/payments/{id}/retry` from the owner interface. Reusing the reference avoids creating another checkout. If delivery fails, replay the webhook from IntaSend's dashboard, or use the owner's Check payment status action (`POST /api/payments/{id}/verify`).

The obsolete client settlement endpoint returns 410 and cannot activate anything. Legacy simulated payment records cannot be verified through IntaSend. The application fails with 503 before creating a payment if required configuration is missing.

## Verification performed

Run `npx tsx --test scripts/test-payments.ts` for provider contract, authorization-independent reconciliation, failure, mismatch, replay and safe retry tests with mocked responses. The workflow test suite also exercises the HTTP authorization and persisted transaction behavior.

No live IntaSend charges are performed by automated tests. Credentials, a public HTTPS deployment and dashboard webhook registration are required to verify actual provider delivery. IntaSend warns that sandbox M-Pesa tests may route through Safaricom's developer platform and reverse test amounts within 48 hours; do not assume such testing has no external effects.

Primary documentation used:

- https://developers.intasend.com/guides/collections/checkout/
- https://developers.intasend.com/guides/collections/overview/
- https://developers.intasend.com/guides/webhooks/
- https://developers.intasend.com/guides/authentication/
- https://developers.intasend.com/guides/testing/
- https://developers.intasend.com/openapi.json
