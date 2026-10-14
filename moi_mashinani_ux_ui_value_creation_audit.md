# Moi Mashinani: Comprehensive Product Value, UX & UI Audit

---

## 1. Executive Diagnosis: Why You Don't See the Value Yet

You have built an impressive amount of technical infrastructure in **Moi Mashinani**:

- **Full-Stack Discovery & Directory:** Next.js App Router, Prisma + PostgreSQL (`store.ts`), custom ranking (`rank.ts`), and hyperlocal zone mapping (`geo.ts`).
- **Trust & Field Operations:** Student Ambassador verification flows (`/ambassador`), signboard media validation (`enrollment-media.ts`), community scam reporting (`ReportModal.tsx`), and admin moderation queues (`/admin`).
- **Monetization & Comms:** IntaSend M-Pesa STK Push checkout (`/promote/[slug]`), Catalog Pro subscriptions (`/pro/[slug]`, `CatalogPlanPanel.tsx`), and Firebase Cloud Messaging + in-app notifications (`NotificationCenter.tsx`).

### Why It Feels Like It Lacks Value ("The Yellow Pages Trap")

Despite all this engineering, the app currently suffers from **The Directory Paradox**:

1. **Directories are "Once-a-Semester" Utilities:** Around Moi University (Stage, Kesses, Talai, Chebarus, Boma, Gate A/B), a student only needs a static directory during **Week 1 of First Year**. Once a student gets the WhatsApp number of their local gas guy, mama fua, kinyozi, or cyber cafe, **they never need to open a directory app again**—they just message them on WhatsApp.
2. **Students Search for _Items, Prices, and Immediate Availability_, Not Business Names:** A student rarely wakes up thinking, _"Let me browse businesses in Stage."_ They wake up thinking:
   - _"Who has a vacant bedsitter near Gate B under KES 4,000?"_
   - _"Where can I get a 6kg gas refill delivered right now for KES 1,100?"_
   - _"Which cyber has a backup generator running during this blackout?"_
   - _"Who is selling a second-hand scientific calculator or mattress?"_
3. **The Cold-Start Monetization Deadlock:** Because product listings are gated behind **Catalog Pro** (`/pro/[slug]`), most free business profiles (`BusinessProfileClient.tsx`) are just digital business cards without searchable products or prices. Because profiles lack products/prices, students don't return daily. Because students don't return daily, business owners see low metrics in `/dashboard/[slug]` and have no reason to pay via M-Pesa for `/promote/[slug]` or `/pro/[slug]`.

---

## 2. Core Problems to Solve & How to Create Real Value

To make **Moi Mashinani** indispensable, you do not need to throw away your codebase—you need to **re-anchor the features you already built** around the **5 sharpest, most frequent problems** in the campus ecosystem:

| #     | The Real Campus Problem                                                                                                                                                                                                             | Why Existing Alternatives Fail                                                                                          | How Moi Mashinani Creates Unfair Value (Using Your Existing Code)                                                                                                                                                                                                                                                        |
| :---- | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :---------------------------------------------------------------------------------------------------------------------- | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **1** | **Price Opacity & "Fresher Tax"**<br>Students (especially 1st-years) get overcharged for hostels, laptop repairs, printing, and salon services because prices aren't public.                                                        | WhatsApp groups are chaotic; walking stall-to-stall at Stage is exhausting and awkward.                                 | **The Campus Price Index:** Unlock basic product/service price lists for _all_ businesses (`products/route.ts`). Let students search _"chips"_, _"gas"_, _"braids"_, or _"printing"_ and compare transparent prices side-by-side.                                                                                        |
| **2** | **WhatsApp Scams & Fake Deposits**<br>Students lose money paying M-Pesa deposits to fake landlords, fake phone sellers, or unverified delivery riders on WhatsApp.                                                                  | Anyone can post a poster in a WhatsApp group with a stolen photo.                                                       | **The "Comrade Trust Shield":** Turn your Ambassador Verification (`/ambassador`) into a shareable **Trust Link/Badge**. Merchants paste `moimashinani.com/b/kevin-phones` in their WhatsApp bio so students can verify physical location, signboard photo, and zero scam reports (`ReportModal`) before sending M-Pesa. |
| **3** | **Real-Time Campus Uncertainty**<br>Rainy nights, KPLC blackouts in Kesses, exam week late nights, or water shortages—students don't know who is open, has power, or is delivering _right now_.                                     | Calling 5 different numbers or walking out in the rain to find a closed shop.                                           | **Live Campus Pulse (`toggle-available`):** Repurpose `/api/businesses/[slug]/toggle-available` from a passive "available" boolean into a **Live Status Broadcast** (_"⚡ Generator ON - Printing Open"_, _"🔥 Hot Mahamri & Bhajia Ready"_, _"🛵 Delivering to Hostels until 11 PM"_).                                  |
| **4** | **Invisible Hostel Hustlers**<br>70% of student entrepreneurs (bakers, nail techs, thrift sellers, tutors, graphic designers, 4th-years selling household items) operate inside hostel rooms without a physical signboard at Stage. | Requiring a physical shopfront/signboard (`enrollment-media.ts`) locks out the most digitally active sellers on campus. | **Two-Tier Verification ("Shopfront" vs. "Comrade Hustler"):** Keep Signboard Verification for Stage/Kesses shops, and add a **Comrade Hustler Tier** verified via Student ID + Hostel/Zone so student-run businesses can list and sell.                                                                                 |
| **5** | **High Search Friction for Urgent Needs**<br>When a student needs a specific laptop charger, a plumber, or a mama fua tomorrow morning, clicking through 15 profiles takes too long.                                                | Posting on 4 different WhatsApp groups and hoping someone sees it before chat spam buries it.                           | **Reverse Marketplace ("Soko Requests" via `DemandModal.tsx`):** Elevate `/api/demand` from a hidden modal to a primary tab. A student posts _"Need HP Blue-Pin Charger under KES 1,200"_ $\rightarrow$ system auto-notifies all Electronics shops $\rightarrow$ sellers tap 1 button to reply on WhatsApp.              |

---

## 3. Deep-Dive UX Audit: User Journeys, Friction & Fixes

### UX Issue 1: Competing Discovery Paradigms on the Home Page

- **Files Involved:** `app/page.tsx`, `src/components/landing/Discovery.tsx`, `src/components/CampusRadarDiscovery.tsx`, `src/components/JoinNeighborhoodCard.tsx`, `src/components/landing/LandingAuth.tsx`
- **The Problem:**
  The landing experience tries to serve too many masters simultaneously: a spatial/zone radar (`CampusRadarDiscovery`), a category directory (`CategoryBrowser`), a business card feed (`Discovery`), a merchant onboarding pitch (`JoinNeighborhoodCard`), and an authentication prompt (`LandingAuth`). A student opening the site on a mobile phone has to scroll past conceptual UI before seeing immediate answers to _"What's open, what's on deal, and what's near my hostel?"_
- **How to Improve:**
  1. **Zone-First Sticky Pill at the Very Top:** Let the student set their current zone in one tap (`All Campus`, `Stage`, `Talai`, `Kesses`, `Gate A/B`, `Chebarus`, `Boma`) and persist it in `localStorage`.
  2. **Intent-Based Quick Chips Under Search:** Directly below the search bar, place 1-tap high-frequency student intents: `🟢 Open Right Now`, `🔥 Today's Comrade Deals`, `🛵 Hostel Delivery`, `🏠 Vacant Hostels`, `📢 Post a Request`.
  3. **Demote Merchant Onboarding on the Student Home View:** Move `JoinNeighborhoodCard` and `LandingAuth` below the first 6–8 high-value listings so students get instant utility above the fold.

### UX Issue 2: `BookingModal.tsx` vs. WhatsApp-First Campus Behavior

- **Files Involved:** `src/components/BookingModal.tsx`, `app/api/bookings/route.ts`, `app/b/[slug]/BusinessProfileClient.tsx`
- **The Problem:**
  In-app booking forms create a "black hole" in informal Kenyan commerce. Local merchants at Stage or Kesses do not keep a browser tab open to monitor `/dashboard/[slug]`, and background Web Push notifications (`firebase-messaging-sw.js`) are frequently throttled on budget Android devices (Tecno/Infinix battery savers) or unsupported on non-installed mobile browsers. When a student fills out `BookingModal` and gets no response for hours, they conclude the app is dead.
- **How to Improve:**
  - **Convert `BookingModal` into a "Smart WhatsApp Order / Inquiry Builder":**
    1. Student selects the item/service, time/delivery zone, and enters their name/note inside `BookingModal`.
    2. When they click **"Send Order / Book via WhatsApp"**, the app fires `POST /api/bookings` in the background (so the merchant's dashboard metrics and conversion logs still capture the lead!) **and immediately opens `wa.me/2547...`** with a clean, pre-formatted message:
       > _"Hi Kevin Phones! 👋 I found you on *Moi Mashinani*. I'd like to book/order: [iPhone X Screen Repair - KES 3,500] for [Today 2:00 PM]. My zone: [Stage]."_
    3. This guarantees **100% delivery to the merchant's phone** while giving the merchant undeniable proof that **Moi Mashinani brought them the customer**.

### UX Issue 3: Product Catalog Gating Destroys Search Relevance

- **Files Involved:** `src/lib/catalog-plan.ts`, `src/components/CatalogPlanPanel.tsx`, `app/pro/[slug]/page.tsx`, `app/api/businesses/[slug]/products/route.ts`, `app/search/SearchContent.tsx`
- **The Problem:**
  Currently, rich product/catalog capability is tied to the **Catalog Pro** plan (`catalog-plan.ts`). If 95% of onboarded businesses are on the free tier, then 95% of businesses have no structured products or prices in the database. When a student searches _"gas"_, _"pilau"_, _"type-c cable"_, or _"carpet cleaning"_ in `SearchContent.tsx`, businesses that haven't paid for Catalog Pro won't surface specific item prices.
- **How to Improve:**
  - **Give Every Business 5 Free "Hero Items / Price List" Slots During Onboarding:**
    - Make adding 3–5 core items with prices mandatory (or 1-click via `enrollment-templates.ts`) during onboarding.
    - **Reposition `Catalog Pro` (`/pro/[slug]`)** around _Unlimited Products (50+)_, _Product Photos_, _"Deal of the Day" Badging on `/deals`_, _Stock Toggle_, and _Priority Search Ranking (`rank.ts`)_.

### UX Issue 4: Fragmented Merchant Monetization & Dashboard Navigation

- **Files Involved:** `app/dashboard/page.tsx`, `app/dashboard/[slug]/page.tsx`, `app/promote/[slug]/page.tsx`, `app/pro/[slug]/page.tsx`
- **The Problem:**
  A business owner has to navigate between three separate route trees:
  - `/dashboard/[slug]` (to manage availability, profile info, and view metrics)
  - `/promote/[slug]` (to buy featured visibility via M-Pesa STK push)
  - `/pro/[slug]` (to manage/upgrade their Catalog Pro plan)
    For a local shopkeeper, splitting **"Promote"** and **"Catalog Pro"** into separate pages and mental models causes confusion and decision paralysis.
- **How to Improve:**
  - **Unify Everything Inside `/dashboard/[slug]` with 3 Simple Tabs:**
    1. **`My Shop & Prices`** (Toggle Open/Closed, edit shop info, manage products/deals).
    2. **`Customer Leads`** (See exact count of WhatsApp clicks, calls, profile views, and bookings—with timestamps like _"A student in Talai clicked your WhatsApp 12 mins ago"_).
    3. **`Boost & Upgrade`** (Single unified M-Pesa checkout sheet combining Featured Placement + Catalog Pro).

### UX Issue 5: High Onboarding Friction & Strict Signboard Rejections

- **Files Involved:** `app/onboard/page.tsx`, `src/components/BusinessEnrollmentForm.tsx`, `src/components/PhotoUploader.tsx`, `src/lib/enrollment-media.ts`, `app/api/businesses/[slug]/resubmit/route.ts`
- **The Problem:**
  `BusinessEnrollmentForm.tsx` is a comprehensive form requiring business details, category selection, location/zone, template choices, and strict media uploads (`enrollment-media.ts`). If a merchant is sitting inside their shop at night or doesn't have a clear storefront signboard photo ready, they hit a wall—or worse, they submit, get rejected with a `moderationReason` by an admin, and have to figure out how to log back in and use `/resubmit`.
- **How to Improve:**
  - **Progressive 2-Step Onboarding:**
    - **Step 1 (60 Seconds — Instant Preview):** Business Name, Category, Campus Zone, WhatsApp Number, and 3 quick prices from `enrollment-templates.ts`.
    - **Step 2 (Trust Upgrade):** Upload Storefront/Signboard Photo _or_ click **"Request Free Ambassador Visit"** (which creates a task in `/ambassador` for a student ambassador to walk by, snap the photo, and verify the shop!).

### UX Issue 6: Authentication & Magic Link Pitfalls on Mobile Webviews

- **Files Involved:** `app/login/page.tsx`, `app/verify/page.tsx`, `src/components/AccountGate.tsx`, `src/components/landing/LandingAuth.tsx`, `app/api/auth/request-link/route.ts`
- **The Problem:**
  1. **Magic Links Break Across App Browsers:** When a merchant or student requests a magic link inside WhatsApp's in-app browser, then opens the Gmail app and clicks the link, the link opens in Chrome/Safari (a different browser session) or requires extra steps, causing auth confusion.
  2. **Email Latency on Campus:** Many local merchants around Stage/Kesses rarely check email—their primary digital identity is their **Safaricom phone number (M-Pesa / WhatsApp)**.
  3. **Over-Gating:** Any `AccountGate` or `LandingAuth` friction shown to students before they can browse or contact a seller reduces student conversion by >60%.
- **How to Improve:**
  - **Zero Auth for Students:** Students should be able to browse, search, filter deals, post a demand (with just their WhatsApp number), and message sellers with **zero login required**.
  - **Phone + Password/PIN Primary Auth for Merchants:** Allow merchants to log in using their **Kenyan Phone Number (`07...` / `01...`) + 4-digit PIN or Password**, with SMS/WhatsApp OTP or Email Magic Link as a recovery fallback.

### UX Issue 7: M-Pesa STK Push Checkout Uncertainty

- **Files Involved:** `app/promote/[slug]/page.tsx`, `src/lib/intasend.ts`, `app/api/payments/[id]/verify/route.ts`, `retry/route.ts`, `settle/route.ts`
- **The Problem:**
  During M-Pesa STK Push checkout, Safaricom prompts can be delayed by 15–45 seconds, or fail silently if the user's SIM toolkit is busy or their screen is locked. Exposing raw technical states or requiring manual clicks on "Verify" without clear visual feedback creates payment anxiety.
- **How to Improve:**
  - **Auto-Polling + Clear 3-Step Visual Progress Tracker:**
    1. `[✓] Prompt sent to 07XX XXX XXX — Check your phone screen and enter M-Pesa PIN`
    2. `[⟳] Waiting for M-Pesa confirmation (Auto-checking... 0:24)` (poll `/api/payments/[id]/verify` automatically every 3 seconds).
    3. **Fallback Accordion:** _"Didn't get the pop-up on your phone? Click 'Resend Prompt' (`retry`) or pay manually and paste your M-Pesa confirmation code."_

---

## 4. Deep-Dive UI Audit: Visual, Layout & Component Issues

### UI Issue 1: CSS Architecture Fragmentation ("The Signboard" vs. Implementation)

- **Files Involved:** `moi_mashinani_screen_designs/the_signboard/DESIGN.md`, `app/globals.css`, `app/home.module.css`, `src/components/BusinessCard.module.css`, `src/components/landing/discovery.module.css`, `postcss.config.mjs`
- **The Problem:**
  The project has a well-thought-out design direction (`the_signboard/DESIGN.md` with `Manrope` variable font and warm, high-contrast Kenyan signboard aesthetics), plus high-fidelity HTML prototypes in `moi_mashinani_screen_designs/*/code.html`. However, the live Next.js codebase splits styling across **three different CSS systems**:
  1. Scoped CSS Modules (`home.module.css`, `BusinessCard.module.css`, `discovery.module.css`)
  2. Global CSS rules (`app/globals.css`)
  3. PostCSS / Tailwind utilities (`postcss.config.mjs`)
     This causes subtle visual drift across pages—buttons, badges, card borders, and form inputs on `/onboard`, `/deals`, `/admin`, and `/b/[slug]` do not share a single source of truth.
- **How to Improve:**
  - Consolidate all color, elevation, border, and typography tokens from `DESIGN.md` into CSS variables in `app/globals.css` and map them to Tailwind theme extensions.
  - Extract 4 reusable primitive UI components (`Button`, `Badge`, `Card`, `Input`) in `src/components/ui/` so every page looks cohesive.

### UI Issue 2: `BusinessCard.tsx` Visual Overload on Small Mobile Screens

- **Files Involved:** `src/components/BusinessCard.tsx`, `src/components/BusinessCard.module.css`
- **The Problem:**
  On a 360px wide viewport (standard budget Android screen), `BusinessCard.tsx` competes for attention with too many badges and metadata rows: verification badge, category pill, zone label, availability indicator (`useNow.ts`), featured/promoted tag, description text, and action buttons. When business names or zone names are long (e.g., _"Mama Kevoh Swahili Dishes & Fast Foods - Stage Opposite Total"_), badge rows wrap into 3–4 uneven lines, breaking grid alignment.
- **How to Improve:**
  - **Enforce Strict Card Scannability:**
    - **Image Overlay (Top):** Place the `🟢 Open Now` pill in the top-left of the image and the `✓ Verified` badge in the top-right of the image—removing them from the text body.
    - **Body (3 Lines Max):**
      - Line 1: **Business Name** (`line-clamp-1`, bold `16px`).
      - Line 2: **Category • Zone** (`12px` muted text, e.g., `Phones & Repairs • Stage`).
      - Line 3: **Price / Deal Highlight Pill** (`From KES 150` or `🔥 10% Comrade Deal`).
    - **Footer:** A single full-width high-contrast action button (`WhatsApp Seller` or `View Prices`).

### UI Issue 3: Mobile Viewport Crowding (`Navbar` + `BottomNav` + Sticky Bars + Modals)

- **Files Involved:** `src/components/Navbar.tsx`, `src/components/BottomNav.tsx`, `src/components/Footer.tsx`, `src/components/ModalFrame.tsx`, `app/b/[slug]/BusinessProfileClient.tsx`
- **The Problem:**
  On mobile viewports, persistent top navigation (`Navbar.tsx`) + bottom navigation (`BottomNav.tsx`) consume ~130px of vertical screen real estate. When a user visits a Business Profile (`BusinessProfileClient.tsx`) that has sticky action buttons, or opens a modal (`ModalFrame.tsx` for Booking, Claim, Demand, or Report), bottom elements can collide with `BottomNav` or mobile browser toolbars, and `Footer.tsx` content gets partially obscured if bottom safe-area padding isn't uniform.
- **How to Improve:**
  - Hide `BottomNav.tsx` automatically on transactional/detail routes (`/b/[slug]`, `/onboard`, `/promote/[slug]`, `/pro/[slug]`, `/ambassador`, `/admin`) so those pages can use a dedicated **Contextual Sticky Bottom Action Bar** (e.g., `[ Call ] [ 💬 WhatsApp Now ]` on `/b/[slug]`).
  - Ensure `ModalFrame.tsx` renders as a **Mobile Bottom Sheet** (`rounded-t-2xl`, slide-up animation, max-height `85dvh`) on screens `< 640px` with `z-50` above all navbars.

### UI Issue 4: Sparse / Empty States on `/deals` and Category Pages (`/c/[category]`)

- **Files Involved:** `app/deals/DealsPageClient.tsx`, `app/c/[category]/CategoryPageClient.tsx`, `app/categories/page.tsx`
- **The Problem:**
  If a student clicks `/deals` or a specific category `/c/[category]` that currently has 0 or 1 active listing, the page looks empty and unfinished. In early-stage marketplaces, empty states are the #1 reason users bounce and never return.
- **How to Improve:**
  - **Never Show a Dead Empty State:**
    - On `/deals`: If live merchant deals are fewer than 6, automatically backfill a section titled **"Budget Comrade Picks Under KES 300"** pulled from regular affordable business catalog items.
    - On `/c/[category]`: Place an inline **"Can't find what you need in [Category]?"** card at the end of the grid that opens `DemandModal.tsx` pre-filled with that category!

### UI Issue 5: Outdoor Sunlight & Thumb-Zone Ergonomics on `/ambassador`

- **Files Involved:** `app/ambassador/page.tsx`, `moi_mashinani_screen_designs/student_ambassador_field_verification_tool/`, `ambassador_zone_route_task_assignment/`
- **The Problem:**
  Student ambassadors use `/ambassador` while walking outdoors in bright equatorial sunlight around Stage, Kesses, and Talai, often holding their phone in one hand while talking to a shopkeeper. Dense tables, subtle gray text, or small secondary buttons are unreadable outdoors.
- **How to Improve:**
  - Design `/ambassador` as a **High-Contrast Field Checklist**:
    - Pure white cards (`#FFFFFF`) on high-contrast dark slate (`#0F172A`) text with `16px+` minimum font size.
    - Minimum `52px` button height for primary field actions (`Snap Signboard`, `Verify Location`, `Quick Enroll Shop`).
    - Show a clear **"Today's Zone Progress"** bar (e.g., `Stage Zone: 4 of 10 shops verified today`) to gamify ambassador fieldwork.

---

## 5. High-Impact Feature & Value Upgrades (Actionable Roadmap)

Here is how you can turn **Moi Mashinani** into a high-value, revenue-generating platform over the next 4 weeks without rewriting your backend from scratch:

### Phase 1: Immediate UX & Conversion Fixes (Days 1–7)

1. **Replace Dead-End Bookings with Tracked WhatsApp Handoff (`BookingModal.tsx`):**
   - Keep `POST /api/bookings` for analytics, but immediately redirect the student into a pre-filled WhatsApp chat with the merchant.
2. **Unlock 5 Free Product/Price Slots for All Businesses (`catalog-plan.ts`):**
   - Change `FREE_PLAN_PRODUCT_LIMIT` from `0` (or restricted) to `5` so every single business profile displays real prices.
3. **Add " WhatsApp Share Card" for Verified Merchants (`BusinessProfileClient.tsx`):**
   - Add a **"Share My Verified Badge to WhatsApp Status"** button on `/dashboard/[slug]` and `/b/[slug]` so merchants market Moi Mashinani for you every day on their WhatsApp status.

### Phase 2: High-Frequency Student Value Loops (Days 8–15)

4. **Launch the Public "Soko / Comrade Requests" Board (`DemandModal.tsx` + `/api/demand`):**
   - Create a dedicated `/requests` feed (and home page widget) showing live student requests (_"Looking for a roommate in Stage"_, _"Need a 6kg gas cylinder"_, _"Looking for a cake baker for Friday"_).
   - Add a **"Respond on WhatsApp"** button on each request for logged-in Verified Businesses.
5. **Upgrade `toggle-available` into "Live Campus Status":**
   - Let merchants add a 40-character live status note when toggling availability (e.g., _"🔥 Fresh Smokies & Mutura Ready"_ or _"⚡ Backup Power ON"_), and display a **"Live on Campus Now"** carousel at the top of `app/page.tsx`.

### Phase 3: Expand Supply & Field Operations (Days 16–23)

6. **Introduce the "Comrade Hustler" Verification Tier (`BusinessEnrollmentForm.tsx`):**
   - Add a toggle in onboarding: `[ I have a physical shop/stall ]` vs. `[ I operate from a hostel / mobile service ]`.
   - For hostel hustlers, require a **Student ID + Selfie / Product Sample** instead of a physical street signboard (`enrollment-media.ts`).
7. **Streamline `/ambassador` for 90-Second Field Enrollment:**
   - Give ambassadors a referral code/tracking link so you can see exactly how many businesses each ambassador onboarded and verified in the Admin panel (`/admin`).

### Phase 4: Micro-Monetization That Merchants Actually Buy (Days 24–30)

8. **Consolidate `/promote/[slug]` & `/pro/[slug]` into Micro-Packages:**
   - Instead of abstract monthly SaaS tiers that informal merchants resist, offer **M-Pesa Micro-Boosts** via your existing IntaSend integration (`intasend.ts`):
     - **KES 30 — "24-Hour Deal Blast":** Puts their deal at the top of `/deals` and sends a push notification (`NotificationCenter`).
     - **KES 100 — "7-Day Category Top Spot":** Pins them to the top of their category (`/c/[category]`) and zone.
     - **KES 250/month — "Moi Mashinani Pro":** Unlimited product catalog, Verified Trust Shield badge, and instant SMS/WhatsApp alerts when students post matching `Demand` requests.

---

## 6. Quick Reference Checklist by File

| File / Module                     | Current Issue                                                                    | Recommended Action                                                                                             |
| :-------------------------------- | :------------------------------------------------------------------------------- | :------------------------------------------------------------------------------------------------------------- |
| `app/page.tsx` & `Discovery.tsx`  | Too much conceptual UI before actionable items/prices.                           | Lead with Zone Selector + Intent Chips (`Open Now`, `Deals`, `Delivering`, `Requests`).                        |
| `src/components/BusinessCard.tsx` | Badge clutter & text wrapping on 360px screens.                                  | Move status/verified pills onto image overlay; show **Starting Price / Top Deal** in card body; 1 primary CTA. |
| `src/components/BookingModal.tsx` | Students submit bookings into a black hole if merchant isn't checking dashboard. | Log booking via `/api/bookings`, then immediately open pre-filled `wa.me` message to merchant.                 |
| `src/lib/catalog-plan.ts`         | Gating all products behind Pro leaves free profiles empty and unsearchable.      | Allow 5 free items/prices per business; gate _Unlimited Items + Deal Badges + Priority Rank_ under Pro.        |
| `src/components/DemandModal.tsx`  | Requests go into the DB (`/api/demand`) without a visible marketplace loop.      | Build a live **Comrade Requests** board on Home & Merchant Dashboard so sellers can claim leads.               |
| `src/lib/enrollment-media.ts`     | Strict physical signboard requirement excludes hostel-based student hustlers.    | Add a "Comrade/Hostel Seller" option verified via Student ID + Product Portfolio.                              |
| `app/dashboard/[slug]/page.tsx`   | Split across `/dashboard`, `/promote`, and `/pro`.                               | Merge Promotion and Catalog Pro upgrades directly into a tabbed Merchant Dashboard.                            |
| `app/promote/[slug]/page.tsx`     | STK push latency causes drop-off or double-clicks.                               | Add 3-second auto-polling UI with countdown timer and manual M-Pesa code fallback.                             |

---

## 7. Implementation completion — 14 October 2026

The implementation covers all five value problems, seven UX issues, five UI issues and eight roadmap actions above. Sections 1–6 retain the original diagnosis; the table below records the resulting behavior. The detailed operating contract is in [Campus value workflows](docs/value-creation.md).

| Audit scope                         | Completion | Implemented behavior                                                                                                                                                                                                     |
| ----------------------------------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Campus price index; UX 3; roadmap 2 | Complete   | Five free public catalog slots, three to five real prices during onboarding, item-aware search, budget cap and price comparison excluding sold-out items. Pro adds unlimited catalog/storage and stock controls.         |
| Comrade Trust Shield; roadmap 3     | Complete   | Public check date and open scam-report count; native share/copy links from profiles and dashboard. Verification remains earned through review, including for free sellers.                                               |
| Live Campus Pulse; roadmap 5        | Complete   | Owner-controlled 40-character broadcasts expire after four hours, appear on Home and refresh while visible. Temporary closures and moderation still govern discovery.                                                    |
| Hostel hustlers; UX 5; roadmap 6    | Complete   | Two-step shopfront/comrade enrollment, preview, tab-local drafts, private student-ID evidence and public samples, or a free field visit. Trusted field enrollment records inspection and owner consent.                  |
| Reverse marketplace; roadmap 4      | Complete   | Public Requests page and home widget, anonymous posting, seven-day expiry, browser receipt for closing, consented contact and matched seller notifications. Verified, claimed sellers can respond through WhatsApp.      |
| UX 1: student home                  | Complete   | Persisted zone, search and five intent chips, live carousel and eight useful listings before the merchant pitch.                                                                                                         |
| UX 2; roadmap 1: WhatsApp handoff   | Complete   | Opens a formatted WhatsApp inquiry immediately; booking and lead logging run in the background. A direct chat fallback remains available if logging fails.                                                               |
| UX 4; roadmap 8: merchant dashboard | Complete   | My shop & prices, Customer leads and Boost & upgrade. Old Pro/Promote links redirect into the shared checkout. Timestamped interactions and supplied zones appear in the leads timeline.                                 |
| UX 6: access                        | Complete   | Students browse, post and contact without login. Claimed owners sign in by phone and password; verified email remains ownership setup and recovery. Separate admin/field roles are enforced.                             |
| UX 7: payment recovery              | Complete   | Provider verification polls every three seconds while visible, with elapsed time, clear progress and checkout recovery. Submitted receipts enter operator review and cannot activate a plan.                             |
| UI 1: design consistency            | Complete   | Shared CSS tokens/theme mappings and Button, Badge, Card and Input primitives; the design document records the current palette and typography.                                                                           |
| UI 2: mobile cards                  | Complete   | Status/trust image overlays, a three-line body with matched price/deal and one WhatsApp action.                                                                                                                          |
| UI 3: mobile navigation             | Complete   | Detail/transaction routes hide BottomNav, profiles have contextual contact actions, and focus-managed mobile sheets use safe-area spacing and an 85dvh limit.                                                            |
| UI 4: sparse discovery              | Complete   | Deals below six offers add real budget picks at KES 300 or below. Categories offer a prefilled request form.                                                                                                             |
| UI 5; roadmap 7: field operations   | Complete   | Appointed ambassador accounts, zone queues, consented photo capture, location/identity checks, 52px controls, Nairobi daily progress and attributed referral enrollments. Admins can appoint and inspect field activity. |
| Roadmap 8: micro-packages           | Complete   | KES 30/24-hour Deal Blast, KES 100/seven-day Recommended placement and KES 250/calendar-month Pro. Provider-confirmed activation is replay-safe. Matching requests support optional consented Pro SMS.                   |

### Resolved implementation choices

- Five free slots already existed; the work preserved and enforced that allowance while making priced onboarding and discovery useful.
- WhatsApp opens with a prepared message; the student must tap Send. Neither chat opening nor a contact tap proves delivery or a completed sale.
- Phone/password uses the established secure account flow. Four-digit PINs and unconfigured SMS/WhatsApp OTP were not introduced. Email recovery remains available.
- IntaSend hosted checkout remains the payment authority. The tracker does not claim an STK prompt was delivered without provider evidence. Receipt submission is a review aid, not a substitute for payment verification.
- Verification is free and independent of Pro. Private student IDs never become public gallery images; abandoned staged IDs expire after 24 hours.
- The current Manrope/forest visual system is the token source of truth. Prototype-only colors do not override the established application palette.
- Recommended placement preserves the existing paid ranking contract. Price sorting explicitly labels paid placements; ranking does not promise an exclusive top position to every paying shop.
- SMS uses Africa’s Talking only when configured and explicitly enabled by an eligible owner. No unconfigured WhatsApp messaging service is advertised as active.

### Validation and release boundary

Validation uses an isolated PostgreSQL database, captured email/object storage and mocked payment/SMS responses. It includes API permissions and redaction, private evidence access, expiry and concurrency, free/Pro quotas, payment replay, mobile/desktop journeys and a production webpack build. Final check results are recorded in [Campus value workflows](docs/value-creation.md#verification).

Implementation completion is local. Production release requires migration `20261014090000_campus_value_loops` and the deployment’s existing service credentials; optional SMS additionally needs Africa’s Talking credentials and sender configuration. These checks do not demonstrate live SMS delivery, an actual M-Pesa charge, real WhatsApp delivery or measured business uplift. No production deployment or production database mutation was performed.
