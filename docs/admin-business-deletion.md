# Admin business deletion

Open **Admin → All listings**, find the business, and choose **Delete business**. The confirmation dialog requires its exact current name. This permanently removes the listing and bookings; it keeps the owner account, payment records and complaint history. Open complaints are marked resolved. A business with a pending payment cannot be deleted until that payment completes or fails.

Deletion requires an authenticated admin and a same-origin request. The business row is locked and deletion runs in one database transaction. Business invitations and enrollment device bindings are revoked, pending listing notifications stop, and the owner receives an inbox notification with email/push delivery queued. Signed-in customers with active requests receive cancellation notifications. The acting admin receives an inbox record of the deletion.

Tracked photos and older hosted photos are queued for cleanup. Storage failures retain the cleanup ledger for the existing catalog-maintenance retry process. Shared legacy photos are checked before removing their underlying file.

Run `npm run test:admin:deletion` with the isolated `npm run test:harness` running. It covers authorization, confirmation, payment protection, mobile cancel/confirm behavior, record retention and cleanup, and notification persistence. No schema migration is required for this feature.
