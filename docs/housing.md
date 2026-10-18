# Community housing

`/housing` is a free, account-free community board with two post types: looking for a house/rental and vacancy available. A vacancy can be shared by a landlord, agent, tenant moving out, or anyone who knows of a place. The header navigation, home housing shortcut, requests board, and hostel category link to it.

Both post types require a WhatsApp number, explicit consent to share that number with anyone who responds (including signed-out visitors), and acknowledgement of the scam caution. Numbers are omitted from the public feed. They become accessible through the WhatsApp handoff after the responder acknowledges the caution. This is not a verified or private-to-members exchange.

The caution appears on the board, during posting, and in a confirmation dialog before responding to either a vacancy or a house seeker. It explains that community people, properties, and vacancies are unverified; Moi Mashinani does not handle rent or guarantee transactions; visitors should inspect, check authority and terms, and avoid advance deposits or viewing fees. A safety reminder also appears in the generated WhatsApp message.

Posts remain visible for seven days. The posting browser stores a management receipt so the author can mark a house search fulfilled or a vacancy taken. Administrators can review and delete housing posts through the existing demand queue. Housing posts do not create billable merchant leads or merchant reply actions. Other product/service requests retain verified business ownership checks and their existing reply allowance and upgrades.

Existing housing-category requests keep their original verified-seller consent and are not converted into open community posts. Authors can create a new housing post to opt into community replies.

The shared location catalog includes campus interior/hostels, Stage & surroundings, Engineering/Aerospace & surroundings, Mabs, Chebarus, Kesses Centre, Cheboiywo, Annex, CHS, and existing areas. “Other Moi campus / area” covers unlisted places; posters should include the campus and landmark in their details. New areas have no invented GPS coordinates or walking times.

Deploy with the normal database migration workflow (`npm run db:migrate`). Migration `20261018120000_community_housing` adds the nullable housing intent, inserts the new areas, and updates the Stage and all-area labels. No existing requests are reclassified. Generate the Prisma client before running the app.

Verification against the disposable workflow harness:

```sh
npm run test:harness
# In another terminal, while the harness is running:
npm run test:housing
npm run test:housing:browser
```

The HTTP tests cover both anonymous post/reply paths, required consent/caution, private feed data, legacy consent, business verification and reply billing, area reference data, post closure and expiry. Browser tests exercise actual posting, responding, location search and closure at mobile and desktop sizes. The tests intercept the final external WhatsApp navigation so no message is sent.
