# MoiMashinani: complete platform user guide

Updated: 9 October 2026.

This guide explains the platform as currently implemented, in this order: students/customers, the main administrator, then businesses. It covers the visible actions, what happens after each action, and how the three groups work together.

Use your deployment's website address. Paths such as `/search` mean that address followed by the path. For local development, the usual address is `http://localhost:3000`. A business's `slug` is the unique text in its profile URL; copy the link provided by the platform rather than guessing it.

## Contents

- [1. Customers and students](#1-customers-and-students)
- [2. Main administrator](#2-main-administrator)
- [3. Business owners](#3-business-owners)
- [4. How the workflows connect](#4-how-the-workflows-connect)
- [5. Accounts, statuses and permissions](#5-accounts-statuses-and-permissions)
- [6. Troubleshooting](#6-troubleshooting)
- [7. Setup before real operation](#7-setup-before-real-operation)
- [8. Current boundaries](#8-current-boundaries)
- [9. Page and category reference](#9-page-and-category-reference)

## 1. Customers and students

### 1.1 Start browsing

Students do not need an account to search, view businesses, contact businesses, submit booking requests, report problems or request a missing service.

1. Open the home page, `/`.
2. Enter what you need in **What are you looking for?**, for example printing, phone repair, braids or gas refill.
3. Choose an area or leave **All areas** selected.
4. Select **Find it**.
5. Open a result to read the full business profile.

The homepage also provides popular-search shortcuts, category shortcuts, **All 12 categories**, **Explore all**, discovery filters and **Browse all**. Discovery filters include **All finds**, **Food & drinks**, **Beauty & care**, **Tech & repair** and **Everyday essentials**. These show a small selection; use **Browse all** for more results.

On interior pages, use **Explore** for search and **Student deals** for offers. On mobile, the bottom menu provides **Home**, **Explore**, **List free**, **Deals** and **Merchant**. Open the hamburger menu for the search box and **Around** area selector.

**List free** is for registering a business. **Merchant** and **Sign in** are for business/admin accounts; students can continue browsing without them.

### 1.2 Search and narrow results

Open `/search`, enter your search phrase and select **Search**.

| Control | What it does |
| --- | --- |
| **Zone** | Prefers businesses in or serving the selected area. Results can still include other areas. |
| Category selector | Limits results to the selected business category. |
| **Available Now** | Shows businesses with a current, unexpired availability flag set by the owner. |
| **Verified** | Shows listings marked field verified, level L2. |
| **Student Deals** | Shows businesses with a student discount/offer recorded. |
| **Best Match** | Uses relevance, area preference, profile quality and eligible promotion placement. |
| **Nearest (Walk Time)** | Sorts by the platform's area-proximity score; it does not measure live distance from your phone. |
| **Newest Listed** | Sorts by listing creation date. |
| **Reset All** | Clears the search and filters. |
| **How ranking works** / **Learn more** | Opens an explanation of search ranking. |

Multiple filters can be used together. If there are no results, broaden the phrase or use **Reset All**. **Search All Campus Zones** removes the area preference; **Browse Categories** returns to the home page.

Area selection in the header does not currently filter the separate category and deals pages. Use advanced search when combining an area preference with other filters.

Featured and Recommended badges indicate paid promotion. They are separate from verification. Promotion does not make an irrelevant business match every search or guarantee a booking.

### 1.3 Browse a category or student deals

Select a category on the homepage to open `/c/CATEGORY-SLUG`. Read the matching business cards and select **View profile**. **Open in Advanced Filter →** opens search with that category selected.

Open **Student deals**, `/deals`, to see businesses with an offer recorded. Read the exact offer, contact the business to confirm its terms, and show your student ID if requested. **Show Student ID to claim** is an instruction for claiming the offer with the business; there is no coupon-redemption button.

Prices shown as **From** are starting prices. Confirm the final price, availability, delivery and any additional charges with the business.

### 1.4 Read a business profile

Select a business's photo, name or **View profile** to open `/b/SLUG`.

You can:

- Read the description, contact details, landmark, address, service modes and student offer.
- Read products/services, starting prices and item photos.
- Select gallery thumbnails to view different photos.
- Check opening hours and any closure or availability notice.
- Read the map/location information supplied for the business.
- Open similar-business profiles.
- Select **Share** to use the device's share panel or copy the link.

**Available Right Now** reflects a four-hour owner availability setting. Opening hours are a separate schedule. Contact the business before travelling if you need confirmation.

An ACTIVE business marked temporarily closed can still be opened through its direct profile link. Its closure notice is shown and new bookings are paused. Temporarily closed businesses are excluded from public discovery lists.

### 1.5 Call, WhatsApp, directions and sharing

| Action | Steps and outcome |
| --- | --- |
| **Call shop**, **Call (number)** or mobile **Call Now** | Opens your device's phone handler with the business number. Complete the call on your device. |
| **WhatsApp** / **WhatsApp Message** | Opens WhatsApp with an inquiry prepared. Review it and send it yourself. |
| **Directions** / **Open Google Maps** | Opens Google Maps using the recorded coordinates, or a location search when no map pin exists. Follow the maps application's directions and confirm the landmark if needed. |
| **Share** | Opens the supported device share panel; otherwise copies the profile link. Paste/send it through your chosen application. |

These actions open external applications. Opening WhatsApp does not send a message automatically, and tapping Call does not prove that the call connected.

### 1.6 Request a booking

1. Open a business profile and select **Request Booking**, or use **Request booking** on a listing card.
2. Choose a **Service** or **General inquiry / price check**.
3. Choose a **Preferred date (Kenya time)**: today or later.
4. Choose a **Preferred time**:
   - Morning: 9:00–11:00 AM.
   - Afternoon: 2:00–4:00 PM.
   - Evening: 5:00–7:30 PM.
5. Enter **Your name** and **Your phone / WhatsApp**.
6. Add an **Extra note (optional)**, such as the device model or work required.
7. Select **Submit booking request**.
8. Wait for **Booking request saved**.
9. Select **Continue on WhatsApp** to contact the business using the prepared request details, or select **Done**.

Your name, number and note are shared with the business. Kenyan mobile numbers beginning with `07`, `01` or `+254` are accepted. The note can contain up to 1,000 characters.

Submission creates a NEW request in the owner's inbox. It does not reserve a time slot or confirm an appointment. Agree on the time and price with the business; the owner records confirmation.

Customers are not charged by this booking form. There is no student booking-history page or self-service cancellation button. To change or cancel a request, call or WhatsApp the business.

Some listing cards omit the booking button when no services are recorded. Temporarily closed, pending, rejected or suspended businesses cannot receive new booking requests.

### 1.7 Report a problem

1. Select the report/shield icon on a business card, or **Report issue** on its profile.
2. Choose **What is the issue?**:
   - Not responding / phone switched off.
   - Wrong number / someone else answered.
   - Shop is permanently closed or moved.
   - Scam / asked for deposit and blocked me.
   - Inappropriate or offensive content.
   - Other issue.
3. Add **Additional Details (Optional)**, up to 1,000 characters.
4. Select **Submit Report**.
5. Wait for **Report Received**, then select **Close**.

The report enters the admin's Reports Queue. Reporting does not immediately suspend the business. The admin reviews it and decides what action to take. Students do not have a report-status tracker.

### 1.8 Request a service you cannot find

1. Search for the service.
2. In the empty-results section, select **Tell Us What You Need**.
3. Review or enter **What do you need?**.
4. Choose **Preferred Campus Zone**.
5. Optionally enter **Your WhatsApp Number** so the team can contact you.
6. Select **Send Request**.
7. Wait for **Got It!**, then select **Done**.

The request appears in the admin's Demand Insights queue. The team can use it to find/enroll a provider and contact you manually. Automatic matching or notifications are not implemented.

### 1.9 Close a dialog or reach owner access

Booking, report, demand and owner-access dialogs can be closed using their X button, Escape, or the provided **Cancel**, **Done** or **Close** button. Clicking outside a standard dialog does not dismiss it.

An unclaimed profile may show **Owner Access**. This explains how the registered owner signs in through their email invitation. It is not a student reward or a way to take ownership of somebody else's business.

## 2. Main administrator

### 2.1 Sign in and open the console

An administrator account must first be created by the platform operator; see [setup](#7-setup-before-real-operation).

1. Open `/login`.
2. Enter your **Email address** and **Password**.
3. Select **Sign in**. Your normal destination is `/admin`.
4. Use **Enroll business** to visit `/admin/enroll`.

On mobile, open the navigation menu for **Admin console** and **Enroll business**. The **Ambassadors** link currently leads to admin enrollment and requires an admin account; there is no separate ambassador portal.

The admin can manage every business through its merchant dashboard. Owners can manage only their linked businesses.

### 2.2 Prepare for a business visit

Bring a phone with internet access, camera access and, if you want a map pin, location permission. Have the owner confirm that their email inbox is accessible. Your admin email and the owner's email should be different.

Collect the following:

| Information | Required or optional | What to record |
| --- | --- | --- |
| Owner name and email | Required | The person responsible for the account and an email they can open. |
| Business name and category | Required | The real trading name and closest category. |
| Description | Required | What they sell/do, useful details and who they serve; 20–3,000 characters in enrollment. |
| Short tagline | Optional | A short explanation of the business's main offer. |
| Phone number | Required | A working Kenyan mobile number. |
| WhatsApp number | Optional | Defaults to the phone number if left blank. |
| Area and nearby landmark | Required | The business's area and a landmark customers can recognise. |
| Address or directions | Optional | Building, floor, shop number or helpful directions. |
| Map pin | Optional | Capture while standing at the shop, or enter its actual latitude and longitude. |
| Service modes | At least one | At the shop, Comes to you, Delivery, Online. |
| Opening hours | Review all seven days | Opening/closing times and days closed, in Kenya time. |
| Photos | Optional, recommended | Clear shop/premises photos and a few representative products. |
| Products/services | Optional, recommended | Names, starting prices, price units and photos. |
| Student offer | Optional | The actual offer and its conditions. |

Confirm the owner is comfortable with the business details and photos being published. Leave unknown map coordinates blank. The platform does not invent a map pin, walking distance or shop photos for a new listing.

### 2.3 Enroll a business during the visit

1. Open **Enroll business**, `/admin/enroll`.
2. Complete **Owner & business**.
3. Complete **Location & contact**.
4. If standing at the shop, select **Use current location** and allow location access. Alternatively enter both coordinates, or leave both blank.
5. Select the relevant **How customers are served** checkboxes.
6. Review **Opening hours** for Monday through Sunday. Defaults are 08:00–18:00 Monday–Saturday, with Sunday closed; change these to the real hours.
7. In **Place & product photos**, use **Take a photo** on a supported mobile device, or **Choose photos**.
8. Wait for photos to finish uploading.
9. Set the cover photo. The first photo is initially the cover; use **Cover** on another photo to move it first. Use the trash button to remove a photo from the enrollment.
10. Add **Products, services & prices**. Enter each name, optional **Price from (KES)** and **Price unit**. Choose its **Product photo** from the uploaded photos.
11. Use **Add another item** for more rows; enrollment supports up to 12. Blank-name rows are omitted.
12. Enter any **Student discount or offer**.
13. Confirm the email spelling with the owner.
14. Select **Enroll business & email owner**.

Photo limits: up to eight enrollment/gallery photos, JPEG/JPG, PNG or WebP, up to 5 MB each. Photos are converted to WebP and their embedded location metadata is removed. Camera behaviour depends on the device/browser; use the file picker if a camera prompt is unavailable.

Enrollment has two outcomes:

- The business is saved as **ACTIVE** and **L2 field verified**, ready for public discovery.
- An email account invitation is sent to the owner. A new owner verifies their email and sets their own password.

Treat this enrollment action as publishing a business you have inspected. Public self-registration follows a separate approval process.

### 2.4 After enrollment

The success page offers:

- **View business**: open the public profile and check the published details.
- **Resend verification email**: request another invitation if needed.
- **Enroll another business**: start a fresh form for your next visit.

Ask the owner to open the email and complete setup while you are present if possible. Do not choose or collect their password for them.

If the message says the business was saved but the email could not be sent, do not enroll it again. Fix the email service/configuration and use resend. The saved listing remains available for admin management.

There is no offline enrollment or saved-draft feature. Unsubmitted form edits can be lost if you reload or leave the page.

### 2.5 Use every admin queue

Open `/admin` and use the tabs. On a narrow screen, swipe the tab row horizontally to reveal all queues. **Refresh** reloads businesses, reports and demand records.

| Queue | Purpose |
| --- | --- |
| **All listings** | Find and edit any listing; suspend/restore it; change field verification. |
| **Owner Accounts** | Inspect owner email verification and invitation delivery; resend an invitation. |
| **Moderation Queue** | Review pending public submissions; approve or reject them. |
| **Renewal Queue** | Review promotions ending within seven days, including already expired records, and prepare a WhatsApp reminder. |
| **Reports Queue** | Handle open customer reports. |
| **Demand Insights** | Review missing-service requests and contact students who supplied a number. |

The console's counters show pending approvals, promotion-expiry records, open reports and ACTIVE listings. Its approval SLA text is an operational target, not an automatic approval timer.

### 2.6 Find, edit, suspend, restore or verify a listing

1. Select **All listings**.
2. Use **Find a business** to search by business name, owner email or area.
3. Select **Edit listing & photos** to open the business dashboard.
4. Use the same details, services, photos, hours, bookings and billing actions described in [business management](#34-use-the-merchant-hub).

Administrative actions save immediately:

| Button | Result |
| --- | --- |
| **Suspend listing** | Changes an ACTIVE listing to SUSPENDED, hides its public profile/discovery and blocks new bookings. Owner/admin management remains available. |
| **Restore listing** | Returns a suspended/rejected listing to ACTIVE and clears the moderation reason. |
| **Approve listing** | Publishes a pending listing as ACTIVE. |
| **Mark field verified** | Sets L2 field verification. Use after checking the business. |
| **Remove field verification** | Removes L2 and sets L1. This does not delete the owner account or its email verification. |

Changing field verification does not purchase a promotion. Suspending a listing is different from the owner's temporary-closure control.

### 2.7 Approve or reject public self-registration

1. Open **Moderation Queue**.
2. Select **Review full listing & photos**.
3. Check the name, category, location, contact number and supplied details.
4. Return to the queue.
5. Select **Approve listing**, or enter a **Rejection reason** and select **Reject**.

Approval publishes the listing but does not automatically mark it field verified. Rejection requires a reason of up to 300 characters. The owner can read the reason in their dashboard and correct their details.

Editing a rejected listing does not automatically resubmit or approve it. After the owner contacts you about the correction, review it through **All listings**, then restore it if appropriate.

Email verification and approval are independent: an owner can verify and edit their account while the listing is still pending/rejected.

### 2.8 Track verification and resend invitations

1. Open **Owner Accounts**.
2. Find the business and check its owner name/email.
3. Read the status: email verified, verification email sent but not yet verified, or verification email not sent.
4. Read any delivery error.
5. Select **Manage listing** to edit the business, or **Resend invitation** for an unverified owner.

Invitation links expire after 24 hours and can be used once. After a replacement email is accepted by the mail service, earlier equivalent invitation links are invalidated; the owner should use the newest email.

Once an owner is verified, the queue stops offering the unverified-account resend button. The owner can request a password reset from `/login`.

There is no admin screen to change an owner's email or transfer account ownership. If the enrollment email is wrong, ask the platform maintainer to correct the ownership record; do not create duplicate listings to work around it.

### 2.9 Handle customer reports

1. Open **Reports Queue**.
2. Read the business, reported issue and additional details.
3. Investigate the issue, contacting the business/customer outside the platform if appropriate.
4. Select one of:
   - **Mark resolved**: records the report as RESOLVED; the listing remains in its current state.
   - **Suspend Shop**: suspends the reported business and removes that report from the open queue.
5. Use **All listings → Restore listing** later if the business should return to the directory.

A customer report is an allegation for review. The platform does not automatically decide its outcome or notify the customer when you resolve it.

### 2.10 Handle unmet demand

1. Open **Demand Insights**.
2. Read the requested service, preferred zone and date.
3. Use the information to find/enroll a suitable business.
4. If a student supplied a number, select **WhatsApp Student** to open a conversation and send your response manually.

There is no demand-assignment, resolved-status or automatic notification control. The queue is currently an intake list for the team's follow-up.

### 2.11 Send promotion renewal reminders

1. Open **Renewal Queue**.
2. Review the business's tier, expiry date and recorded interaction totals.
3. Select **1-Tap WhatsApp Nudge**.
4. Review the prepared reminder, expiry date and renewal link.
5. Send it manually in WhatsApp if appropriate.

The reminder uses the current deployment's promotion link and recorded call/WhatsApp tap totals. It does not claim those taps became completed calls or sales. Reminders are not scheduled or sent automatically, and clicking the button does not renew or charge the business.

Expired paid-tier records can remain in this queue even though their public promotion has ended.

### 2.12 Manage a business's bookings and payments

The admin can open any listing's dashboard, read its booking inbox, contact the customer and update request statuses. This is the same workflow available to the owner.

For payments, use that dashboard's **Billing** tab to read the amount, state and receipt, or **Promote** to open the checkout/status page. IntaSend verification controls activation. There is no admin button to manually mark a payment paid or grant a paid tier.

Admin-initiated checkout requires an actual payment, just like owner-initiated checkout. Operational credentials and webhook setup are in [payments.md](payments.md).

### 2.13 Suggested operating routine

| When | Actions |
| --- | --- |
| Before visits | Sign in, check connectivity/camera/location, identify unmet demand and prepare the required information. |
| During each visit | Enroll, upload real photos, confirm owner email, inspect the public listing and help the owner find their invitation. |
| After visits | Check Owner Accounts for unverified owners or delivery failures; resend when appropriate. |
| Daily | Review pending submissions, customer reports and demand; follow up and restore corrected businesses where appropriate. |
| Regularly | Review expiry records and send relevant renewal reminders manually. |

## 3. Business owners

### 3.1 Join through an admin visit or register yourself

**Admin-assisted enrollment:** give the visiting admin your accurate details and accessible email. The admin publishes the inspected listing and sends your invitation. Continue with email verification below.

**Self-registration:**

1. Select **List your business** / **List free**, or open `/onboard`.
2. Complete the same owner/business, location, service modes, opening-hours and item details described in the enrollment checklist.
3. Select **Submit listing & verify email**.
4. Check your email and complete account verification.
5. Wait for admin approval before customers can discover/book the listing.

Self-registration creates a **PENDING**, **L0**, free listing. It can include up to 12 initial products/services. Public registration defers photo uploads until you have verified and signed in; add photos from your dashboard.

If email delivery fails, the business remains saved. Use **Resend verification email** or request an account link at `/login`.

If you have several businesses, use the same owner email when enrolling them so they are linked to the same business account. Use the same login for those businesses.

### 3.2 Verify your email and set your password

1. Open the newest MoiMashinani verification email, checking spam if necessary.
2. Open its complete link.
3. Enter **Password** and **Confirm password**.
4. Use 12–128 characters and enter the same password in both fields.
5. Select **Verify & open my account**.
6. The platform signs you in and opens your business dashboard.

If the invitation adds another business to an existing account, enter your existing password in both fields. If you forgot that password, request a reset through the login page.

Verification links expire in 24 hours and are single-use. Email verification establishes account access and marks the linked ownership as claimed. It does not approve a pending listing, grant field verification or activate a paid promotion.

### 3.3 Sign in, reset your password and sign out

To sign in, open `/login`, enter **Email address** and **Password**, then select **Sign in**.

For an expired invitation, unverified account or forgotten password:

1. Open `/login`.
2. Select **Verify your email or reset your password**.
3. Enter your registered email.
4. Select **Email account link**.
5. Open the new email and complete the verification/password form.
6. Use **Back to sign in** if you want to return to password login.

The page uses a general success message for privacy; it does not confirm that an email/account exists. For an account that already has a password, this sends a password-reset link. Completing a reset signs out previous sessions and invalidates outstanding account links.

Use **Sign out** in the header or mobile navigation menu to end your current session. Sessions otherwise expire after seven days.

If access is denied, use **Use another account** and sign in with the email registered for that business. **Try again** retries a failed account-access check.

### 3.4 Use the merchant hub

1. Select **Merchant hub** or mobile **Merchant**, or open `/dashboard`.
2. Under **Your Merchant Hub**, select **Manage business →** on your business.
3. If you have multiple linked businesses, use **Your businesses** / **Switch business** in the dashboard.

Each business dashboard has these tabs:

| Tab | Main actions |
| --- | --- |
| **Overview** | Availability, temporary closure, interaction counters and promotion status. |
| **Bookings** | Read/contact customers and change request status. |
| **Services** | Add, edit and remove products/services, prices and item photos. |
| **Details** | Edit business information, contact, category, area, map pin and student offer. |
| **Photos** | Upload/remove gallery photos and choose a cover. |
| **Hours** | Set weekly hours, closed days and appointment-only days. |
| **Billing** | Read payment history and receipts. |
| **Share** | Copy/open the public profile link. |

The header also provides **View profile** and **Promote**.

A pending, rejected or suspended listing can still be edited by its owner. Read its displayed status/reason, make corrections and contact the admin for review. Customers cannot open those profiles publicly.

### 3.5 Set availability or temporarily close

In **Overview**:

- Select **Available now for 4 hours** when you can respond/serve customers now.
- Select **Turn off Available now** when you want to end the availability flag early.
- Select **Mark temporarily closed** to pause public discovery and new booking requests.
- Select **Reopen business** when you are operating again.

These actions save immediately. Availability cannot be enabled on a non-ACTIVE or temporarily closed listing. Its badge expires after four hours unless changed earlier.

Temporary closure is not admin suspension. There is no scheduled reopening control in the owner UI; reopen manually. Opening hours are edited separately.

### 3.6 Understand your counters

**Overview** shows **Profile views**, **Calls**, **WhatsApp**, **Directions clicks** and **Booking requests**.

These are recorded interactions/taps, not unique-customer totals, completed calls, completed jobs or revenue. Repeat interactions can increase counts. New listings begin with zero recorded activity; demonstration data may contain seeded metrics.

**Promotion status** shows the active tier and expiry in Kenya time, or **Free organic listing** when no current promotion is active.

### 3.7 Manage bookings

1. Open **Bookings**. The tab can show a count of NEW requests.
2. Select **Refresh** to load recent requests.
3. Read the service, requested date/time, customer name, phone and note.
4. Tap the phone number to call, or **WhatsApp** to contact the customer.
5. Agree the appointment and price directly.
6. Choose the appropriate **Request status**.

| Status | How to use it |
| --- | --- |
| **NEW** | The request has arrived and needs review. |
| **CONFIRMED** | You have agreed the appointment with the customer. |
| **COMPLETED** | The agreed work/service is finished. |
| **CANCELLED** | The request will not proceed. |

Status changes save immediately, without a separate Save button. Updating a status does not send an automatic customer notification or lock an appointment slot. Tell the customer yourself through the provided contact options.

### 3.8 Add, edit or remove products and services

Open **Services**.

**Add an item:**

1. Under **Add a service or product**, enter **Name**.
2. Enter **Starting price (KSh, optional)**, or leave it blank for **Contact for price**.
3. Add a **Note**, up to 500 characters.
4. Optionally choose a **Product / service photo**.
5. After upload, wait for **Photo ready. Save the item to attach it.**
6. Select **Add item**.

**Edit an item:** select **Edit**, change the fields, then **Save item**. **Cancel edit** discards the editor changes.

**Remove an item:** select its trash/remove button. Removal saves immediately; there is no confirmation dialog.

**Remove an item photo:** use **Remove photo** in the editor, then save the item.

The saved listing supports up to 30 products/services. Prices must be non-negative; the server accepts starting prices up to KES 10,000,000. Product photos use the same supported file formats and 5 MB limit as gallery photos, but are separate from the eight gallery slots.

The enrollment form can record a price unit. The current dashboard editor does not expose the price-unit or upper-price fields; existing values are preserved when you edit the other item fields.

### 3.9 Edit business details and student offers

1. Open **Details**.
2. Edit the business name, tagline, phone/WhatsApp, landmark, address, student discount, category, zone or description.
3. To update the map pin, use **Use current location** while at the business, or enter both **Latitude** and **Longitude**.
4. To remove an inaccurate pin, clear both coordinate fields.
5. Select **Save business information**.
6. Wait for **Changes saved.** and check **View profile**.

The business name, phone, WhatsApp and landmark are required in this editor. A student offer appears in the public profile and makes the business eligible for the deals list once the listing is ACTIVE and discoverable. Clear the offer and save to remove it.

Changing the business name does not regenerate its existing profile URL. The owner editor does not change owner email/name, ownership, approval status, verification level or paid tier.

### 3.10 Upload, remove and choose gallery photos

1. Open **Photos**.
2. Use **Add photos** to select JPEG/JPG, PNG or WebP images, up to 5 MB each.
3. Keep at most eight gallery photos. Remove an existing photo before adding more if full.
4. Wait for the upload and save message.
5. Select **Use as cover** on the image you want customers to see first.
6. Use **Remove** under a photo to remove it from the gallery.

Uploads, cover changes and gallery removals save immediately. The selected cover button displays **Cover photo**. Removing the current cover chooses the first remaining gallery photo, or leaves no cover if the gallery is empty.

Gallery photos and item photos are separate uses. Removing a gallery image does not automatically remove an item's existing reference to that image; edit the item separately if needed.

### 3.11 Update opening hours

1. Open **Hours**.
2. For each weekday, set **Open** and **Close** in Kenya time.
3. Check **Closed** for days you do not operate.
4. Check **Appointment only** for days customers should arrange a visit first.
5. Select **Save opening hours**.

Use real hours rather than leaving the initial defaults. For an overnight business, a closing time earlier than opening time can represent closing the next morning.

Hours are displayed to customers; they do not create a reservable appointment calendar or automatically enable **Available Now**.

### 3.12 Buy a promotion through IntaSend

Your listing must be ACTIVE before you can promote it.

1. Select **Promote**, or open `/promote/SLUG`.
2. Choose **Recommended** or **Featured**.
3. Choose **1 week**, **2 weeks** or **4 weeks**.
4. Review the estimated end date and **Total**.
5. Confirm **Payment phone number**, initially your business phone.
6. Select **Pay KSh AMOUNT with IntaSend**.
7. Complete the payment on IntaSend's hosted checkout using M-Pesa or another available payment method.
8. Return to the platform and wait for **Payment verified**.
9. Select **View your dashboard** and confirm the tier/expiry under **Overview**.

| Promotion | 1 week | 2 weeks | 4 weeks | Placement |
| --- | ---: | ---: | ---: | --- |
| Free listing | KES 0 | KES 0 | KES 0 | Organic discovery while approved and eligible. |
| Recommended | KES 100 | KES 200 | KES 400 | Recommended badge and promoted placement above eligible free listings. |
| Featured | KES 200 | KES 400 | KES 800 | Priority eligible search placement and Featured sections. |

The server calculates the price. The payment purchases listing promotion, not a customer product order. Enter an M-Pesa PIN only in the appropriate payment prompt on your phone; MoiMashinani's form does not request it.

Payments are one-time. There is no automatic renewal. Renewing the same active tier extends its current expiry. An upgrade buys the chosen duration from payment verification, without prorated credit. An active Featured promotion blocks choosing a new Recommended purchase until Featured expires.

Placement remains subject to relevance and listing eligibility. Suspended or temporarily closed businesses do not gain public discovery simply because a paid term exists.

### 3.13 Pending, failed or interrupted payment

If an unfinished checkout already exists, opening **Promote** loads it so you can continue.

- **Open IntaSend checkout** reopens/resumes that checkout.
- **Check payment status** asks the provider to verify the payment.
- **Waiting for payment confirmation** means the payment is not yet verified complete.
- **Payment incomplete** shows a failed attempt and its available failure details.

You can close the page and return. A provider redirect alone does not activate promotion; confirmation must be verified. Once complete, the page shows a receipt/reference. Check the actual promotion dates in **Overview**.

If your phone/provider reports payment success but the page is still waiting, use **Check payment status** before attempting another payment. Contact the admin with the reference if it remains unresolved. The same verified payment is applied once even if a webhook is delivered repeatedly.

If configuration is missing, the page displays **Payments are not configured. Please contact the administrator.** The operator must configure the provider first.

In the unusual case that an older Recommended payment completes while a separate Featured term is already active, the platform preserves Featured and adds equivalent value as Featured time. The dashboard's recorded dates are authoritative.

### 3.14 Read billing history

Open **Billing**, then **Refresh**.

You can read the plan, number of weeks, creation time, amount, payment state, receipt if available and failure reason if present.

| State | Interpretation |
| --- | --- |
| CREATED | A payment record exists; checkout setup may still need to complete. |
| PENDING | Awaiting payment/confirmation. |
| PROCESSING | Provider processing or another incomplete intermediate state. |
| COMPLETE | Verified and applied to the promotion. |
| FAILED | An attempt was unsuccessful; use the promotion page to review/retry/check. |
| EXPIRED | Shown if a record has been stored with an expired state. |

Billing is read-only. Use **Promote** for checkout/status recovery. There is no receipt-PDF download, refund button or manual-paid button in this version. Older demonstration payment records may appear in development data; they are not proof of a real IntaSend charge.

### 3.15 Share your profile

1. Open **Share**.
2. Select **Copy profile link**.
3. Wait for **Public profile link copied.**
4. Paste it into WhatsApp Status, a customer message, social media or your own materials.
5. Use **Open public profile →** to check it.

The platform does not automatically post to your social accounts. A pending/rejected/suspended profile remains unavailable to public visitors even when its owner has copied the link.

### 3.16 Suggested owner routine

| When | Actions |
| --- | --- |
| After verification | Check contact, category, map, hours, photos, products and the public profile. |
| During business hours | Enable availability when able to serve customers; review and refresh bookings. |
| For each booking | Contact the customer, confirm the arrangement, then record the status. |
| When something changes | Save revised details, prices, offers and hours; update photos. |
| During a break/closure | Mark temporarily closed; reopen manually when ready. |
| Before promotion expires | Review results and choose whether to renew through IntaSend. |

## 4. How the workflows connect

| Workflow | Student/customer | Admin | Business owner |
| --- | --- | --- | --- |
| Admin field enrollment | Discovers the ACTIVE listing. | Visits, records details/photos/items, publishes and sends invitation. | Verifies the email, sets password and manages the listing. |
| Public self-registration | Sees the listing after approval. | Reviews the pending submission and approves/rejects it. | Registers, verifies email and corrects details while awaiting review. |
| Booking | Submits a request and contacts the business. | Can assist through the business inbox. | Reads the request, agrees the appointment and updates status. |
| Report | Submits an issue for review. | Investigates, resolves or suspends; can restore later. | Corrects information/operations and contacts admin if suspended. |
| Missing service | Describes the need and optionally supplies a number. | Reviews demand, finds providers and follows up manually. | A suitable new business can be enrolled. |
| Promotion | Sees eligible promoted placement and badges. | Configures payment operation and can assist with status/reference. | Pays through IntaSend; verified completion activates/extends placement. |

Booking confirmation, report outcomes, demand follow-up and renewal reminders currently require human communication. Invitation/password-reset emails are the account emails that the platform sends automatically when configured.

## 5. Accounts, statuses and permissions

### 5.1 Four separate concepts

| Concept | Meaning |
| --- | --- |
| Email/account verification | The person controls the registered email and can sign in. |
| Listing approval | The admin allows the business to appear publicly. |
| Field verification | The admin marks the listing L2 after checking it. |
| Paid promotion | A verified payment provides Recommended/Featured placement for a term. |

Completing one does not automatically complete the others.

### 5.2 Listing status

| Status | Public access | Owner/admin management |
| --- | --- | --- |
| PENDING | Hidden while awaiting approval. | Available to the linked owner/admin. |
| ACTIVE | Public profile available; discovery depends on eligibility/closure. | Available. |
| REJECTED | Hidden; rejection reason shown privately to owner/admin. | Available for corrections. |
| SUSPENDED | Hidden; new bookings blocked. | Available for corrections/review. |

Temporary closure is a separate flag on a listing, not one of these approval statuses.

### 5.3 Verification levels

L0 is the initial unverified listing level. L2 is the admin's field-verified level and the level used by the **Verified** search filter. L1 is an intermediate listing level that can appear on existing records or after L2 is removed.

The current account-verification mechanism is email. Do not interpret older L1/OTP wording in the trust page as an available SMS-verification action. A verification badge does not guarantee service quality or a payment outcome.

### 5.4 Who can do what?

| Action | Student/public visitor | Linked business owner | Admin |
| --- | --- | --- | --- |
| Search/read ACTIVE profiles | Yes | Yes | Yes |
| Contact, book, report or request a service | Yes | Yes | Yes |
| Submit public business registration | Yes | Yes | Yes, though field enrollment is the admin workflow |
| Admin field enrollment | No | No | Yes |
| Manage a private listing | No | Their linked businesses | Every business |
| Read private booking/payment/analytics records | No | Their linked businesses | Every business |
| Approve/reject/suspend/restore/field-verify | No | No | Yes |
| Read all reports/demand queues | No | No | Yes |
| Buy listing promotion | No | Their ACTIVE businesses | Any ACTIVE business |
| Manually mark payment complete | No | No | No |

Public profiles do not expose owner email, private booking inboxes, payment histories or owner analytics.

## 6. Troubleshooting

| Problem | What to do |
| --- | --- |
| No search results | Broaden the phrase, remove filters or choose Reset All. Use Tell Us What You Need for a missing service. |
| Search/category/deals load error | Check connectivity and reload/retry. An error is different from an empty result. |
| Listing not visible | Check approval status and temporary closure. A paid badge does not bypass those rules. |
| Wrong location | Owner/admin: update both coordinates and save, or clear both to remove the pin. |
| No invitation email | Confirm registered email, check spam, request a new link or ask admin to resend. Operator: check SMTP/delivery errors. |
| Email failed during enrollment | The listing is still saved. Resend after fixing delivery; do not submit a duplicate enrollment. |
| Invalid/expired/used link | Request a fresh account link from the login page and use the latest email. |
| Existing-account invitation rejects password | Use your existing password, or request a password reset first. |
| No businesses in merchant hub | Check you used the enrolled owner email; ask the enrolling admin to confirm ownership. Do not claim another business through its public notice. |
| Account access required | Sign out/use another account and sign in with the correct role/email. |
| Too many requests | Wait and retry later. Repeated sign-ins, link requests, uploads and public submissions are rate limited. |
| Camera unavailable | Use Choose photos/file upload. Use JPEG/PNG/WebP within the size limit. |
| Photo upload rejected | Check format, size and the eight-photo gallery limit. Do not rename a non-image file to an image extension. |
| GPS permission denied | Allow device/browser location access or enter real coordinates manually; both can be left blank. |
| Clipboard/share unavailable | Copy the public URL from the browser address bar instead. |
| Booking not confirmed | Contact the business. Saved requests need human agreement; there is no automatic slot reservation. |
| Student wants cancellation/change | Contact the business so the owner can update the request and agree any revised time. |
| Owner edited a rejected listing | Contact admin to review; editing does not automatically republish it. |
| Payment pending after provider success | Check payment status on Promote; give admin the reference if unresolved. |
| Payments not configured | Operator must supply provider settings and register the webhook before checkout works. |
| Offer no longer valid | Owner: clear/update the student-discount field and save. Student: confirm the offer directly with the business. |

Details, hours and product edits require their named Save/Add buttons. Availability, closure, booking-status changes, gallery uploads, cover selection and removal actions save immediately. Wait for a success message; leaving the page does not save a draft.

## 7. Setup before real operation

This section is for the platform owner/developer operating the deployment. The earlier role instructions assume the website and external services have been configured.

### 7.1 Database and application

1. Install project dependencies with `npm install`.
2. Configure the deployment environment using [.env.example](../.env.example). Preserve an existing database configuration; do not overwrite it blindly.
3. Set `DATABASE_URL` and the public `APP_URL`.
4. Apply migrations with `npm run db:migrate`.
5. Run development with `npm run dev`, or build/start the configured production application.

For an existing database without migration history, follow the baselining instructions in [onboarding.md](onboarding.md#initial-setup). Do not baseline an empty database or reseed existing business records as a setup shortcut.

### 7.2 Create the main admin

Set `ADMIN_EMAIL`, `ADMIN_NAME` and `ADMIN_PASSWORD` in the local secret environment. Use a password of 12–128 characters.

```sh
npm run admin:create
```

The command creates an ADMIN account and refuses to overwrite an existing account. Remove `ADMIN_PASSWORD` from the environment after bootstrap. Public registration cannot grant admin access.

At the time of the recorded local verification, no real admin had been bootstrapped. Test administrators existed only in the disposable test database.

### 7.3 Enable account emails

Configure `RESEND_API_KEY` and `EMAIL_FROM`. Verify the sender domain in Resend. Account verification and password-reset messages are sent through the Resend HTTPS API, and the public application URL must use HTTPS.

Test enrollment with an inbox you control and confirm that the full verification link opens your deployment. SMTP acceptance alone does not prove delivery to the recipient's inbox.

### 7.4 Enable IntaSend

Configure:

- `INTASEND_MODE`: sandbox initially, or live for live operation.
- `INTASEND_PUBLIC_KEY` and `INTASEND_SECRET_KEY` matching that environment.
- `INTASEND_WEBHOOK_CHALLENGE`.
- An HTTPS `APP_URL`.

Register the deployment's `/api/payments/webhook` endpoint and the matching challenge in IntaSend for collection events. Follow [payments.md](payments.md) for the exact configuration and verification/retry behaviour.

Complete a provider checkout and verify the delivered webhook, stored receipt and promotion dates before enabling live collections. Automated local tests used mocked provider responses and mocked email delivery; they did not verify a real email-provider inbox or make an external payment charge.

### 7.5 Maintenance and verification

Keep database backups, including legacy uploaded-photo data, and protect the Cloudflare R2 bucket. New uploaded images are stored under `moimashinani/photos/` in R2; PostgreSQL stores their URLs. Existing database-backed images remain accessible through `/api/uploads/<id>`. Configure the R2 environment variables on each deployment (see [onboarding.md](onboarding.md)). Removing a photo from a listing does not delete its R2 object. Do not reset/seed production records to fix a configuration problem.

See [verification.md](verification.md) for the existing check results and [onboarding.md](onboarding.md#testing) for repeatable isolated workflow tests.

## 8. Current boundaries

The guide documents current screens. The following are not available as user actions in this version:

- Student/customer accounts, favourites, reviews, booking history or report-status tracking.
- Shopping cart, customer product checkout, inventory/stock management, delivery tracking or merchant payouts.
- A reservable calendar, automatic booking confirmation, or customer status notifications.
- Automatic demand matching, demand-resolution controls or scheduled renewal reminders.
- Owner email changes, ownership transfer, account deletion or permanent listing deletion through the UI.
- Owner editing of service modes, tags, extra categories, served areas, price level, walk-time text or profile slug through the current Details form.
- A separate ambassador account/application portal.
- Customer GPS radar/range/map-mode controls: a radar component exists in the repository but is not mounted on the current homepage.
- SMS OTP account verification. Current account setup uses email.
- Automatic promotion renewal, refund controls, receipt PDF downloads or manually granting paid tiers.
- Offline enrollment and draft autosave.

Some explanatory UI wording is older than the current implementation, including SMS OTP/trust wording and the ranking modal's fixed organic-results promise. Use the behaviours documented here: email establishes account access, L2 is field verification, and result composition depends on the eligible businesses available.

For permanent closure, use temporary closure to stop discovery/booking immediately and contact the admin about the listing's longer-term status.

## 9. Page and category reference

### 9.1 Main pages

| Path | Purpose |
| --- | --- |
| `/` | Homepage search, categories and local discoveries. |
| `/search` | Search, filters, sorting and missing-service requests. |
| `/c/CATEGORY-SLUG` | Category listings. |
| `/deals` | Student offers and trust information. |
| `/b/SLUG` | Public business profile/contact/booking/report/share. |
| `/onboard` | Public business self-registration. |
| `/login` | Business/admin login and account-link requests. |
| `/verify?token=EMAIL-TOKEN` | Verification/reset link opened from email. |
| `/admin` | Admin console and queues. |
| `/admin/enroll` | Admin field enrollment. |
| `/ambassador` | Redirects to admin enrollment. |
| `/dashboard` | Businesses linked to the signed-in account. |
| `/dashboard/SLUG` | Manage one business. |
| `/promote/SLUG` | IntaSend promotion checkout/status. |

### 9.2 Areas

Browsing supports **All Kesses**, **Moi Main Gate**, **Kesses Centre**, **Stage**, **Soweto**, **Cheboiywo**, **Talai** and **Annex (Eldoret)**. Enrollment uses a specific area rather than All Kesses.

### 9.3 Categories

| Category | URL slug |
| --- | --- |
| Phone & Laptop Repair | `phone-laptop-repair` |
| Printing & Cyber | `printing-cyber` |
| Salons & Kinyozi | `hair-beauty-kinyozi` |
| Food & Cafes | `food-cafes` |
| Laundry & Mama Fua | `laundry-mama-fua` |
| Cooking Gas & Groceries | `gas-groceries` |
| Hostels & Vacancies | `hostels-rooms` |
| Photography & Media | `photography-video` |
| Tutors & Revision | `tutors-academics` |
| Tailoring & Alterations | `tailoring-fashion` |
| Wi-Fi & Tech Gadgets | `wifi-tech-gadgets` |
| Cakes & Bakery | `cakes-bakes` |

### 9.4 Related operator documents

- [Enrollment and account setup](onboarding.md)
- [IntaSend payment setup](payments.md)
- [Workflow verification record](verification.md)

This guide was checked against the application's current pages, forms, role checks and workflow handlers. Revisit it when changing UI actions, account rules, prices or payment behaviour.
