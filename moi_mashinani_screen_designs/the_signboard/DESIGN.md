---
name: The Signboard
colors:
  surface: '#f9f9ff'
  surface-dim: '#c7dbff'
  surface-bright: '#f9f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f0f3ff'
  surface-container: '#e7eeff'
  surface-container-high: '#dee8ff'
  surface-container-highest: '#d5e3ff'
  on-surface: '#001c3b'
  on-surface-variant: '#594045'
  inverse-surface: '#193151'
  inverse-on-surface: '#ebf1ff'
  outline: '#8d6f75'
  outline-variant: '#e1bec4'
  surface-tint: '#b90c55'
  primary: '#9b0044'
  on-primary: '#ffffff'
  primary-container: '#c2185b'
  on-primary-container: '#ffd9df'
  inverse-primary: '#ffb1c2'
  secondary: '#795900'
  on-secondary: '#ffffff'
  secondary-container: '#fdc33b'
  on-secondary-container: '#6f5100'
  tertiary: '#005658'
  on-tertiary: '#ffffff'
  tertiary-container: '#107072'
  on-tertiary-container: '#a0f0f2'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#ffd9df'
  primary-fixed-dim: '#ffb1c2'
  on-primary-fixed: '#3f0018'
  on-primary-fixed-variant: '#8f003f'
  secondary-fixed: '#ffdea0'
  secondary-fixed-dim: '#f7be36'
  on-secondary-fixed: '#261900'
  on-secondary-fixed-variant: '#5c4300'
  tertiary-fixed: '#a0f0f2'
  tertiary-fixed-dim: '#84d4d5'
  on-tertiary-fixed: '#002021'
  on-tertiary-fixed-variant: '#004f51'
  background: '#f9f9ff'
  on-background: '#001c3b'
  surface-variant: '#d5e3ff'
typography:
  headline-xl:
    fontFamily: Archivo Narrow
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 52px
  headline-xl-mobile:
    fontFamily: Archivo Narrow
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 36px
  headline-lg:
    fontFamily: Archivo Narrow
    fontSize: 36px
    fontWeight: '700'
    lineHeight: 40px
  headline-lg-mobile:
    fontFamily: Archivo Narrow
    fontSize: 26px
    fontWeight: '700'
    lineHeight: 30px
  headline-md:
    fontFamily: Archivo Narrow
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 28px
  headline-sm:
    fontFamily: Archivo Narrow
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 24px
  body-lg:
    fontFamily: Atkinson Hyperlegible Next
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 26px
  body-md:
    fontFamily: Atkinson Hyperlegible Next
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-sm:
    fontFamily: Atkinson Hyperlegible Next
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-lg:
    fontFamily: Archivo Narrow
    fontSize: 15px
    fontWeight: '700'
    lineHeight: 18px
  label-md:
    fontFamily: Archivo Narrow
    fontSize: 13px
    fontWeight: '600'
    lineHeight: 16px
  label-sm:
    fontFamily: Archivo Narrow
    fontSize: 11px
    fontWeight: '700'
    lineHeight: 14px
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  gutter: 1rem
  gutter-desktop: 1.5rem
  margin: 1rem
  margin-desktop: 2.5rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2.5rem
---

## Brand & Style

The design system draws direct inspiration from the vernacular hand-painted storefront signage, kiosk typography, and vibrant notice boards typical of shopping centers surrounding Moi University’s Main Campus in Kesses. The UI bridges authentic local commerce and modern functional utility, providing an immediate sense of place and legibility under direct Rift Valley sunlight.

The design language balances tactile, physical realism with purposeful digital brutalism:
- **Vernacular Tactility:** Elements behave like physical storefront badges, pasted decals, and enamel shop signs, using distinct 1.5px outlines and hard offset shadows.
- **Utilitarian Speed:** Built for students and local business operators walking between classes or hostels, prioritizing instantaneous phone/WhatsApp access over decorative flourishes.
- **High Visual Contrast:** Sharp, unblurred edges, crisp structural hairlines, and intentional primary accents deliver optimal readability even on entry-level mobile screens in glaring outdoor light.

## Colors

The palette captures the physical environment of Kesses and the energetic identity of Kenyan university trade:
- **Primary (Bougainvillea - `#C2185B`):** Dominant brand shade and call-to-action color, inspired by the thorny, bright flowering hedges across Eldoret and campus gates.
- **Secondary (Jua Sun Yellow - `#FFC53D`):** Dedicated to the "Featured" tier, vendor highlights, and promo accents, signaling midday brightness.
- **Tertiary (Deep Teal - `#0B6E70`):** Reserved for the "Recommended" tier, verified badges, and trusted academic/student services.
- **Neutral (Midnight - `#0B2545`):** Structural ink color applied to core text, deep buttons, active strokes, and sharp drop shadows.
- **Canvas Base (Chalk - `#F2F5F8`):** Ultra-soft, cool-tinted off-white background that prevents glare while grounding vibrant shop badges.
- **System Accent (WhatsApp Green - `#25D366`):** Dedicated exclusively to immediate merchant chat flows and direct commerce CTAs.
- **Hairline Border (`#D5DCE4`):** Soft dividing border used strictly for grid separators, standard containers, and neutral list item dividing lines.

## Typography

Typography establishes an intentional contrast between the compressed, eye-catching cadence of painted signboards and clinical legibility:
- **Headlines & Signboards (`Archivo Narrow`):** Dense, condensed, and assertive. Headings run in uppercase or title-case to evoke hand-stenciled wooden boards and market kiosks. Mobile typography shifts to compact line-heights to conserve screen real estate.
- **Body & Numerical Information (`Atkinson Hyperlegible Next`):** Deliberately chosen for maximum legibility under harsh light, small screens, and quick glanceability. Distinct letterforms ensure price tags, phone digits, and hostel directions are unambiguous.
- **Labels, Badges & Micro-Copy (`Archivo Narrow`):** Always rendered with prominent weight (`600` or `700`) to anchor small category tags and pricing indicators.

## Layout & Spacing

The layout is built upon a modular fluid grid calibrated for high information density on mobile devices, with adaptive margins for tablets and laptops:
- **Mobile (< 768px):** 4-column fluid layout with `1rem` outer canvas margin and `1rem` gutter. Content cards take full-width single-column slots for quick thumb reach.
- **Tablet (768px - 1024px):** 8-column fluid layout with `1.5rem` outer margins and `1rem` gutters. Directory cards reflow into a clean 2-column card catalog.
- **Desktop (> 1024px):** 12-column layout maxing out at `1200px` container width with `2.5rem` outer margin and `1.5rem` gutter. Sidebars handle location filters (e.g., Stage, Cheptiret gate, Soweto, Annex).
- **Rhythm Rules:** All layout elements, stacked cards, and contact bars strictly employ multi-step spacing (`space-xs` through `space-xl`) to preserve clean alignment alongside the hairline grid dividers.

## Elevation & Depth

This design system avoids soft, atmospheric drop shadows and blurred glassmorphism in favor of tangible physical elevation:
- **Hard Offset Shadow:** Badges, featured items, and interactive shop cards feature a hard `2px 2px 0px #0B2545` drop shadow with zero blur.
- **Crisp Structural Outlines:** Interactive elements carry a `1.5px solid #0B2545` structural border, referencing physical die-cut enamel plates or screen-printed vinyl decals.
- **Active State Physics:** When tapped or clicked, buttons and cards compress directly into their shadow (`translate(2px, 2px)` with `box-shadow: 0px 0px 0px #0B2545`), delivering immediate haptic visual feedback.
- **Hairline Dividers:** Inactive containers and structural partitions utilize flat `#D5DCE4` borders without drop shadows to reduce cognitive load across dense merchant lists.

## Shapes

The shape system adopts a sturdy, slightly softened geometry (`0.25rem` radius) that simulates cut sheet metal, laminated notices, and street signs:
- **Default Elements (`0.25rem`):** Applied to standard cards, inputs, secondary badges, and buttons to maintain strict rectangular alignment.
- **Stickers & Badges (`0.5rem` / `rounded-lg`):** Category indicators, "Featured" markers, and status tags use soft chamfered corners with hard offset borders to mimic peel-off vinyl decals.
- **Floating Floating Action / Contact Pills:** WhatsApp quick-action triggers and phone call shortcuts use full pill rounding for distinct ergonomic contrast against the angular card directory.

## Components

### Buttons
- **Primary Brand Button:** Solid `#C2185B` background, pure white text in Archivo Narrow Bold, `1.5px solid #0B2545`, with `2px 2px 0px #0B2545` hard shadow.
- **WhatsApp Direct Action Button:** Solid `#25D366` background, Midnight `#0B2545` text and icon, `1.5px solid #0B2545`, with `2px 2px 0px #0B2545` shadow. Dedicated for 1-tap inquiries.
- **Secondary / Outline Button:** Chalk background `#F2F5F8`, Midnight `#0B2545` border (`1.5px`), Midnight text, collapsing into flat stroke on active press.

### Sticker Badges (Physical Decals)
- **Featured Tier Badge:** Jua Sun Yellow (`#FFC53D`) background, Midnight `#0B2545` bold text, `1.5px` Midnight border, and `2px 2px 0px #0B2545` shadow.
- **Recommended Tier Badge:** Deep Teal (`#0B6E70`) background, pure white text, `1.5px` Midnight border, and `2px 2px 0px #0B2545` shadow.
- **Campus Landmark Tag:** Translucent white background with `#D5DCE4` border denoting locations (e.g., "Stage", "Soweto Market", "Talai Center").

### Cards
- **Business Listing Card:** Crisp white surface bounded by a `1.5px solid #0B2545` frame with a `2px 2px 0px #0B2545` offset shadow. Contains the shopfront sign title, campus proximity indicator, status (Open/Closed), and the signature Two-Tap Action strip.
- **Featured Listing Card:** Same construction as the standard card, capped by an attached Jua-colored `#FFC53D` header band and high-contrast verification decals.

### Two-Tap Contact Strip
- Embedded at the bottom edge of every vendor card.
- Divided into two distinct physical blocks: Tap 1 (`Call Now` - Midnight outline) and Tap 2 (`WhatsApp Merchant` - WhatsApp Green pill with direct pre-filled chat link).

### Input Fields & Search
- Field frame: White background with crisp `1.5px solid #0B2545` border and subtle `2px 2px 0px #D5DCE4` under-shadow.
- Focused state: Border swaps to Bougainvillea `#C2185B` with a sharp `2px 2px 0px #0B2545` drop shadow. Font set to Atkinson Hyperlegible Next for fast query reading.

### Checkboxes & Filters
- Compact squares with `1.5px solid #0B2545`. Checked state filled with Bougainvillea `#C2185B` and a solid white checkmark graphic. Zero blur on focus outlines.