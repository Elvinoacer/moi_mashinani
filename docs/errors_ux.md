Below is the technical UX and user-flow audit for **Moi Mashinani** (`moimashinani.gtss.software`), documenting the exact issues shown in your screenshots alongside the underlying route/component architecture in the repository and actionable fixes for each flow.

---

## Part 1: Core UX & Flow Issues from Your Screenshots

### 1. Search Directory Above-the-Fold Bloat & Missing Results Scroll

- **Affected Files**: `app/search/page.tsx`, `app/search/SearchContent.tsx`, `app/globals.css`.

- **Observed UX Problem**:
- On mobile viewports, the `HOME / SEARCH DIRECTORY` filter card consumes 100% of the screen above the bottom navigation bar (`Home`, `Explore`, `Requests`, `Deals`, `Market`), pushing all search results completely below the fold.

- After typing `"Phones"` and tapping `Search`, the `Refine results (Area, category, budget & more filters)` accordion remains expanded (`^`), leaving the user staring at filter inputs (`All Kesses`, `Find a type: mitumba, juice, boda...`, `Choose a business type`, `Price up to · KES`) with zero visual indication of how many results were found or where the results start.

- **UI & Redundancy Bugs Inside the Card**:
- The magnifying glass icon overlaps the bottom-left border of the `"Phones"` text input instead of sitting centered inside the input padding.

- Two separate clear controls sit stacked near each other: a `Clear` text button below the `Search` button and a `Clear all` action next to the `Active: "Phones" ×` chip.

- Category selection uses two stacked full-width controls (`Find a type: mitumba, juice, boda...` text input AND a `Choose a business type` select dropdown) plus helper text (`Browse by need, then choose a business type.`), consuming ~180px of vertical height.

- **Suggested Fixes**:

1. **Collapse Filters by Default & Auto-Collapse on Search**: In `app/search/SearchContent.tsx`, initialize the `Refine results` accordion state to `false` (collapsed) on mobile viewports, and automatically set it to `false` whenever the user submits the search form or applies a filter.

2. **Auto-Scroll to Results Container**: Attach a `useRef` (e.g., `resultsRef`) to the results header bar and trigger `resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })` on search submission.

3. **Show Live Result Count in the Collapsed Filter Bar**: Update the `Refine results` button label to display active filter counts and total matches (e.g., `Refine results (1 active) · 14 matches found ↓`) so users immediately know results exist below.

4. **Consolidate Controls & Fix Input Icon CSS**:

- Remove the standalone `Clear` link under the `Search` button and keep only the `Active: "Phones" ×` / `Clear all` chip row.

- Merge `Find a type` and `Choose a business type` into a single searchable combobox or horizontal scrollable category pills.

- Fix the search input icon positioning in `app/globals.css` / `app/search/SearchContent.tsx` using `position: relative` on the input wrapper and `top: 50%; transform: translateY(-50%)` on the SVG icon.

---

### 2. Low Visibility & Poor Placement of "Report a Problem"

- **Affected Files**: `app/b/[slug]/BusinessProfileClient.tsx`, `app/b/[slug]/page.tsx`, `app/api/reports/route.ts`.

- **Observed UX Problem**:
- On the business profile page, `Report a Problem` is rendered as a tiny, unstyled red text link floating in the margin between the massive dark-green `ORDER / INQUIRE VIA WHATSAPP` button and the `Comrade trust shield` card.

- Because it has no button container, border, icon, or padding, it is visually overpowered by the adjacent `ORDER / INQUIRE VIA WHATSAPP` button and the sticky bottom bar (`Call`, `Order / book`, `WhatsApp now`).

- Worse, the `Comrade trust shield` card directly beneath it explicitly displays trust and scam status (`"Field verification has not been completed. Location: Opposite Megabytes. No open scam reports recorded..."`), but the action to actually report a scam or issue is disconnected from that card.

- **Suggested Fixes**:

1. **Move "Report a Problem" Inside the `Comrade trust shield` Card**: Place the report trigger directly at the bottom of the `Comrade trust shield` card in `app/b/[slug]/BusinessProfileClient.tsx`, where users are already reading about verification and scam reports.

2. **Style as a High-Affordance Outlined Action Button**: Give the button a clear warning/flag icon, a visible border (`1px solid rgba(180, 35, 24, 0.35)`), subtle red-tinted surface background, and `44px` minimum touch height (e.g., `[🚩 Report a Problem or Scam]`) matching the visual weight of the `GET WALKING DIRECTIONS` button.

---

### 3. Broken 1-Character Vertical Text Wrapping in Merchant Workspace

- **Affected Files**: `app/dashboard/[slug]/page.tsx`, `app/globals.css`.

- **Observed UX Problem**:
- In the `MERCHANT WORKSPACE` header card (`app/dashboard/[slug]/page.tsx`), the business name `"Jenifer Zolif"` wraps vertically almost one character per line (`J / e / n / i / f / e / r / Z / o / li / f`) down the left edge of the card.

- A stray separator dot (`.`) also sits on its own line between `suspended` and `Opposite megabytes`.

- **Root Cause**: The header layout places the business title container and the action buttons (`View profile` and `Promote`) side-by-side in a flex/grid row where the buttons take up most of the horizontal width on mobile, squeezing the title container into a narrow sliver with `overflow-wrap: anywhere` or `word-break: break-word`.

- **Suggested Fixes**:

1. **Stack Title and Action Buttons on Mobile**: In `app/dashboard/[slug]/page.tsx` and `app/globals.css`, change the workspace header container to `flex-direction: column` on mobile screens (`< 640px`), allowing the business name (`Jenifer Zolif`), status badge (`suspended`), and location (`Opposite megabytes`) to span 100% width.

2. **Place Action Buttons in a Full-Width Row Below the Metadata**: Render `View profile` and `Promote` in a 2-column grid (`grid-template-columns: 1fr 1fr; gap: 0.75rem`) underneath the location text on mobile.

3. **Set Safe Text-Wrapping Rules**: Apply `word-break: normal; overflow-wrap: break-word; min-width: 0;` to the heading and keep `suspended · Opposite megabytes` in a `flex-wrap: wrap; align-items: center; gap: 0.5rem` row so the separator dot never orphans onto its own line.

---

### 4. Chaotic Free Listing, Comrade Market Loops & "Guessed" Tab Filtering

- **Affected Files**: `app/market/page.tsx`, `app/onboard/page.tsx`, `app/login/page.tsx`, `app/register/page.tsx`, `app/verify/page.tsx`, `app/dashboard/[slug]/page.tsx`, `app/api/businesses/route.ts`, `app/api/businesses/[slug]/products/route.ts`, `app/api/businesses/[slug]/refresh-market/route.ts`, `prisma/schema.prisma`, `docs/onboarding.md`, `docs/verification.md`.

#### A. Why the Free Listing / Comrade Market Flow Causes a Redirect & Verification Loop

- **What Happens in the Repo**:
- **No Standalone P2P Listing Model**: In `prisma/schema.prisma`, the platform does not treat a one-off student second-hand item as a lightweight, standalone peer-to-peer post; everything is coupled to the `Business` / merchant architecture and its `Product` catalog.

- **The 4-Gate Loop**:

1. **Gate 1 (Entry Confusion)**: A student taps `+ List free` in the top navbar (`/onboard`) or goes to the `Market` bottom tab (`/market`) where they see `One item or hostel service`.

2. **Gate 2 (Auth & Verification Bounce)**: If not signed in, they are routed through `/login` or `/register` and `/verify` (`app/api/auth/request-link`, `app/api/auth/verify`, `app/api/auth/phone/*`).

3. **Gate 3 (Merchant Requirement)**: When returning to list an item, the system requires a merchant/business entity (`app/onboard/page.tsx`, `app/api/businesses/route.ts`, `app/dashboard/page.tsx`). If the user only created a basic user account without completing business onboarding, they are forced to create a merchant profile first.

4. **Gate 4 (Verification & Admin Approval Block)**: As stated on the Comrade Market banner (`"Sellers are verified before listing"`) and the Merchant Workspace banner (`"This listing is suspended. You can update its information here; customers can book after admin approval"`), newly created or unverified accounts (`app/api/enrollment/proof/route.ts`, `app/api/businesses/[slug]/verification/route.ts`) are blocked from having their listings appear publicly until admin/ambassador verification completes.

- **Suggested Fix for the Listing & Verification Loop**:

1. **Decouple P2P Student Listings from Full Business Onboarding**: Allow any authenticated student with a verified phone/WhatsApp number to submit the `One item or hostel service` form on `/market` (`app/market/page.tsx`) in **one single step**.

2. **Auto-Provision a Lightweight "Comrade Seller" Profile Behind the Scenes**: If the backend (`app/api/businesses/route.ts`) requires a `Business` foreign key in `prisma/schema.prisma`, auto-create a hidden/lightweight `COMRADE_SELLER` record using the user's name and WhatsApp number (`0712 345 678`) during form submission instead of redirecting them to `/onboard`.

3. **Replace Hard Pre-Listing Blocks with Tiered Trust Badges**: Instead of blocking or suspending free student listings until field verification is done (`"Field verification has not been completed"`), publish low-risk second-hand/declutter items immediately (or after an automated check) with an `"Unverified Comrade Seller — Meet in public on campus"` badge, reserving mandatory ambassador field verification (`app/ambassador/page.tsx`) for permanent shops or Verified Badge upgrades.

#### B. Where "Second-Hand Goods" & Other Tab Filtering Logic Comes From ("Are We Guessing?")

- **What Happens in the Repo**:
- On `/market` (`app/market/page.tsx`), the inline form includes a `Listing type` select field with options like `Declutter / second-hand item` and hostel service.

- However, in the main business onboarding flow (`app/onboard/page.tsx`), the merchant workspace product manager (`app/dashboard/[slug]/page.tsx`, `app/api/businesses/[slug]/products/route.ts`), and the directory search (`app/search/SearchContent.tsx`, `app/api/categories/route.ts`), businesses and products are categorized using standard directory categories (`categories`) and free-text descriptions/tags—**not** the Comrade Market `Listing type` taxonomy.

- Furthermore, `/market` relies on a separate refresh mechanism (`app/api/businesses/[slug]/refresh-market/route.ts`) and filters tabs by matching category slugs, keyword heuristics (e.g., `"mitumba"`, `"declutter"`, `"second-hand"`, `"hostel"`), or flags that only get set when created through the `/market` form rather than `/onboard` or `/dashboard/[slug]`.

- **Suggested Fix for Tab & Category Filtering**:

1. **Enforce an Explicit Enum in Prisma (`prisma/schema.prisma`)**: Define a single source-of-truth enum (e.g., `ListingKind`: `DIRECTORY_BUSINESS`, `SECOND_HAND_ITEM`, `HOSTEL_SERVICE`, `DEAL`) on the `Product` / `Business` model.

2. **Expose the Same Classification in Both `/dashboard/[slug]` and `/market**`: When a merchant adds a product in `app/dashboard/[slug]/page.tsx`or posts via`app/market/page.tsx`, require them to select the exact `ListingKind`and`Category`from`/api/categories`.

3. **Remove Heuristic/Keyword Guessing in `/api/businesses` and `/market**`: Filter tabs strictly by the database `ListingKind`and`categoryId` fields so every tab shows deterministic, predictable items.

---

## Part 2: Other Confusing User Flows Across the Platform & Suggested Fixes

### 5. Competing Entry Points: `+ List free` (Top Nav) vs. `Market` (Bottom Nav)

- **Affected Files**: `app/layout.tsx`, `app/onboard/page.tsx`, `app/market/page.tsx`.

- **The Confusion**:
- The top header permanently displays a green `+ List free` CTA on every screen—even when the user is already inside the `Merchant Workspace` (`) or on the `Comrade Market` listing form (`).

- Users do not know whether `+ List free` is for registering a permanent shop (`/onboard`) or posting a free second-hand item (`/market`), leading merchants and students into the wrong funnel.

- **Suggested Fix**:
- Hide `+ List free` when the user is already inside `/dashboard/*`, `/onboard`, or `/market`.

- When tapped from public pages, open a simple 2-option chooser modal or segmented screen:

1. **🏪 Register a Campus Business / Shop** (routes to `/onboard`).

2. **🎒 Sell a Second-Hand Item / Comrade Skill** (routes directly to the `/market` post form).

### 6. Inline Form + Browsing Collision on Comrade Market (`/market`)

- **Affected Files**: `app/market/page.tsx`.

- **The Confusion**:
- In Screenshot 4 (``), the `Comrade Market` page stacks the hero banner (`BUILT FOR COMRADES — Comrade Market`, with a `<- Back to listings` button) directly above the creation form (`One item or hostel service`) on the same `/market` route.

- Tapping `Market` in the bottom navigation bar (``) drops users into a hybrid state where browsing listings and filling out a multi-field submission form compete for the same mobile screen.

- **Suggested Fix**:
- Keep `/market` purely for **browsing and filtering** Comrade Market items, with a sticky `+ Post an Item` button.

- Move the `One item or hostel service` creation form into a dedicated slide-up sheet/modal or sub-route (`/market/new`) so the browsing state and posting state are cleanly separated.

### 7. Fragmented Auth & Verification Flows (Magic Links, Passwords, and Phone OTPs)

- **Affected Files**: `app/login/page.tsx`, `app/register/page.tsx`, `app/verify/page.tsx`, `app/api/auth/login/route.ts`, `app/api/auth/register/route.ts`, `app/api/auth/request-link/route.ts`, `app/api/auth/verify/route.ts`, `app/api/auth/phone/request/route.ts`, `app/api/auth/phone/verify/route.ts`, `app/merchant/action/[token]/page.tsx`.

- **The Confusion**:
- The repository contains multiple overlapping authentication mechanisms: standard login/register (`/api/auth/login`, `/api/auth/register`), email/magic-link verification (`/api/auth/request-link`, `/api/auth/verify`), phone OTP verification (`/api/auth/phone/request`, `/api/auth/phone/verify`), and tokenized merchant action links (`/merchant/action/[token]`).

- Users frequently lose their `callbackUrl` / `redirectTo` context when bouncing between `/register` -> `/verify` -> `/login`, landing on a blank `/dashboard` instead of the listing or deal they were trying to post or join.

- **Suggested Fix**:
- Standardize on a single primary auth method (e.g., Phone/WhatsApp + Password or OTP) and pass a persistent `?next=/target-path` query parameter through `/login`, `/register`, and `/verify` so users return to their exact action upon completion.

### 8. Business Claiming vs. New Enrollment vs. Suspended Resubmission

- **Affected Files**: `app/b/[slug]/BusinessProfileClient.tsx`, `app/api/businesses/[slug]/claim/route.ts`, `app/api/enrollment/proof/route.ts`, `app/api/enrollment/media/route.ts`, `app/api/businesses/[slug]/resubmit/route.ts`, `app/dashboard/[slug]/page.tsx`.

- **The Confusion**:
- Seeded campus businesses (`prisma/seed.ts`, `prisma/seed-production.ts`) can be claimed via `/api/businesses/[slug]/claim`, while new businesses onboard via `/onboard` and upload proofs via `/api/enrollment/proof` and `/api/enrollment/media`.

- Meanwhile, when a listing is `suspended` (as seen in Screenshot 3: `"This listing is suspended. You can update its information here; customers can book after admin approval"`), the merchant sees `View profile` and `Promote` at the top of `MERCHANT WORKSPACE` (``), while the actual `Resubmit for Approval` action (`/api/businesses/[slug]/resubmit`) and moderation reason (`moderationReason`in`prisma/migrations/20261009020000_moderation_reason`) are buried or unclear.

- **Suggested Fix**:
- When a business is `suspended` in `app/dashboard/[slug]/page.tsx`, disable the `Promote` button (a merchant should not be prompted to pay to promote a suspended listing!).

- Display the exact `moderationReason` inside the yellow suspension banner along with a primary CTA button (`Fix & Resubmit for Approval`) that scrolls directly to the required fields and triggers `/api/businesses/[slug]/resubmit`.

### 9. Duplicate & Competing Contact CTAs on Business Profiles

- **Affected Files**: `app/b/[slug]/BusinessProfileClient.tsx`, `app/api/bookings/route.ts`.

- **The Confusion**:
- In Screenshot 2 (``), the user sees a full-width inline button `ORDER / INQUIRE VIA WHATSAPP`and simultaneously sees a sticky bottom bar with three more buttons:`Call`, `Order / book`, and `WhatsApp now`.

- Having both `ORDER / INQUIRE VIA WHATSAPP` (inline) and `Order / book` + `WhatsApp now` (sticky footer) confuses users on whether `Order / book` opens an in-app booking modal (`/api/bookings`) or redirects to WhatsApp.

- **Suggested Fix**:
- Remove the redundant inline `ORDER / INQUIRE VIA WHATSAPP` button from the middle of `BusinessProfileClient.tsx`.

- Keep only the sticky bottom bar, and clarify the labels: `📞 Call`, `📅 Book In-App` (triggers `/api/bookings`), and `💬 WhatsApp`.

### 10. Confusing Monetization Split: "Promote" (`/promote/[slug]`) vs. "Pro" (`/pro/[slug]`)

- **Affected Files**: `app/promote/[slug]/page.tsx`, `app/pro/[slug]/page.tsx`, `app/api/businesses/[slug]/plan/route.ts`, `app/api/payments/route.ts`, `docs/catalog-plans.md`, `docs/payments.md`.

- **The Confusion**:
- The codebase has two separate upgrade routes for merchants: `/promote/[slug]` (`app/promote/[slug]/page.tsx`) and `/pro/[slug]` (`app/pro/[slug]/page.tsx`), backed by `/api/businesses/[slug]/plan` and IntaSend M-Pesa STK push (`/api/payments/route.ts`).

- Merchants in `/dashboard/[slug]` see a `Promote` button (``) but do not have a clear side-by-side comparison explaining the difference between a Featured/Promoted placement boost vs. a Catalog Pro subscription tier.

- **Suggested Fix**:
- Consolidate `/promote/[slug]` and `/pro/[slug]` into a single **Plans & Promotion** view (or tab inside `/dashboard/[slug]`) with clear tier cards comparing **Free**, **Catalog Pro**, and **Featured Boost** before triggering the M-Pesa STK checkout.

### 11. Floating Notification Bell Overlapping Page Content

- **Affected Files**: `app/layout.tsx`, `app/globals.css`, `app/api/notifications/route.ts`.

- **The Confusion**:
- In Screenshot 3 (`) and Screenshot 4 (`), a floating white pill with a bell icon and green badge (`🔔 3` / `🔔 2`) is fixed at the bottom-right of the viewport.

- In Screenshot 4 (``), this floating notification pill directly overlaps the `Listing type` (`Declutter / second-hand item`) dropdown chevron and form inputs!

- **Suggested Fix**:
- Move the notification bell icon and unread badge (`2` / `3`) into the **top navigation bar** next to the `+ List free` and hamburger menu button (``), eliminating the floating bottom-right overlay that blocks form inputs and cards.

---

## Part 3: Summary Action Matrix

| Priority          | Area / Flow                            | Primary Repo Files                                     | Key Fix                                                                                                              |
| ----------------- | -------------------------------------- | ------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------- |
| **P0 (Critical)** | **Merchant Workspace Broken Text**<br> | `app/dashboard/[slug]/page.tsx`, `app/globals.css`<br> | Stack title/metadata full-width above `View profile` / `Promote` buttons on mobile; remove character-level wrapping. |

|
| **P0 (Critical)** | **Comrade Market & Free Listing Loop**<br> | `app/market/page.tsx`, `app/onboard/page.tsx`, `app/api/businesses/route.ts`<br> | Allow 1-step student item posting by auto-creating a lightweight seller profile; publish second-hand items with an "Unverified" badge instead of hard-blocking.

|
| **P0 (Critical)** | **Search Directory Above-the-Fold Bloat**<br> | `app/search/SearchContent.tsx`, `app/globals.css`<br> | Collapse `Refine results` by default on mobile, auto-scroll to results on submit, fix search icon alignment, and merge duplicate category/clear controls.

|
| **P1 (High)** | **Explicit Tab & Category Filtering**<br> | `prisma/schema.prisma`, `app/api/businesses/route.ts`, `app/dashboard/[slug]/page.tsx`<br> | Replace keyword/category guessing with a strict `ListingKind` enum shared across `/onboard`, `/dashboard/[slug]`, `/market`, and `/search`.

|
| **P1 (High)** | **"Report a Problem" Visibility**<br> | `app/b/[slug]/BusinessProfileClient.tsx`<br> | Move into the `Comrade trust shield` card and style as a full-width outlined warning button with a flag icon.

|
| **P2 (Medium)** | **Floating Bell & CTA Clutter**<br> | `app/layout.tsx`, `app/b/[slug]/BusinessProfileClient.tsx`<br> | Move the floating `🔔` pill into the top navbar; remove the duplicate inline WhatsApp CTA on business profiles; hide `Promote` on suspended listings.

|
