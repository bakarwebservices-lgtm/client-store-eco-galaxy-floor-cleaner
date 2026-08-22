# BUILD_STANDARDS.md
## AWWeb Merged SaaS Template — Permanent Build Standards & Rules

> **MANDATORY READ:** This file must be read in full at the start of every session before any work begins.
> Every feature must satisfy all applicable standards below before being marked complete.
> This file is the single source of truth for all build rules, schema decisions, feature scope, and quality standards for this project.
> Update this file immediately if any decision or standard changes — never let it drift from reality.

---

## TABLE OF CONTENTS

1. [Process Rules](#1-process-rules)
2. [Schema & Architecture Decisions](#2-schema--architecture-decisions)
3. [Feature Scope — Included vs. Excluded](#3-feature-scope--included-vs-excluded)
4. [Quality Standards](#4-quality-standards)

---

## 1. PROCESS RULES

### 1.1 Vertical Feature Building (Non-Negotiable)
- [ ] **Build one feature end-to-end at a time:** UI component + API route + backend logic + database interaction, all together, before starting the next feature.
- [ ] **Never build all UI first and wire logic later.** This is the exact failure pattern from both Attireburg and Vortex Rings — buttons existed with no connected routes.
- [ ] A feature is **not done** until the button/action works end-to-end and has been manually tested.
- [ ] Each feature must also satisfy all applicable Quality Standards (Section 4) before it is marked complete.

### 1.2 Feature Connection Checklist (Maintained Throughout Build)
- [ ] Maintain a living feature checklist table at all times, in this format:

  | Element | Intended Action | Route / Handler | Status |
  |---|---|---|---|
  | `<Add Feature>` | `<What it does>` | `<API or server action path>` | `Connected` / `Not Connected` |

- [ ] Nothing is silently left half-wired. Every UI element with an action must appear in this table.
- [ ] This table lives in `FEATURE_CHECKLIST.md` at the project root and is updated after every session.

### 1.3 Architecture Map Verification Before Each Task
- [ ] Before starting any task, verify `ARCHITECTURE.md` and `SCHEMA.md` against the actual code **for the specific files about to be touched** — not a full codebase scan.
- [ ] If the map is out of date for those files, update the map first, then proceed.
- [ ] A stale architecture map is worse than no map. Keeping it accurate is a discipline requirement, not optional.

### 1.4 Living Architecture & Schema Documentation
- [ ] `ARCHITECTURE.md` (at project root): maps every major system area (products, orders, auth, admin, etc.) to its actual files and folders.
- [ ] `SCHEMA.md` (at project root): documents every database table, field, type, and relationship.
- [ ] Both files are updated **immediately** whenever a meaningful change is made — not retroactively, not after the fact.
- [ ] These files replace the need to scan the codebase to find anything. They must be trustworthy at all times.

### 1.5 Git Workflow
- [ ] **Two branches only:** `main` (always stable, always deployable) and `development` (active feature work).
- [ ] **Never commit directly to `main`.** All work happens on `development`.
- [ ] Merge from `development` to `main` only after local testing passes.
- [ ] **Testing before merge means more than "it ran without crashing."** Check edge cases: empty inputs, boundary values, wrong file types, unusual data, concurrent actions — not just the happy path.
- [ ] Commit messages are written by the agent, detailed, and describe exactly what changed and why. They double as searchable project history. No separate manual changelog needed.

### 1.6 Centralized Theme / Design Tokens (Non-Negotiable)
- [ ] A single `theme.config.ts` (or equivalent) file defines **all** design tokens: colors, fonts, spacing, border radius, shadows.
- [ ] Every component references a token variable. **No hardcoded color, font, or spacing values anywhere in component code.**
- [ ] Rebranding a client deployment = changing values in this one file. It must cascade everywhere with zero component-level changes.
- [ ] Theme tokens must also be readable from the `Setting` model for admin-editable branding (logo URL, primary color, store name).

### 1.7 Consistent Folder Structure
- [ ] One folder per feature domain (e.g. `/products`, `/orders`, `/auth`, `/admin`, `/checkout`).
- [ ] Shared/reusable components (buttons, cards, inputs, modals) live in `/components/ui` — never rewritten per page.
- [ ] The folder structure is predictable enough that any file can be found from the architecture map without scanning.

### 1.8 Shared Data Structures
- [ ] Define shared TypeScript types/interfaces for all core domain objects (Product, Order, Customer, CartItem, etc.) in one shared location (e.g. `/types`).
- [ ] Both frontend and backend use these shared types. No diverging data shapes between UI and API layers.

### 1.9 Centralized Error Handling
- [ ] One consistent approach for catching, logging, and displaying errors across the entire application.
- [ ] Decide the approach before building features, not per-feature ad hoc.
- [ ] All API routes return consistent error response shapes. All frontend components handle errors consistently.

### 1.10 Centralized Input Validation
- [ ] One consistent validation approach for all forms and API route inputs (e.g. Zod schemas).
- [ ] Every form validates on the client; every API route re-validates on the server. Never trust client input alone.
- [ ] Bad or malformed data must never reach the database.

### 1.11 Environment Separation
- [ ] Development and production configs are strictly separate.
- [ ] Test/sandbox credentials (payment gateways, tracking IDs, courier APIs) must **never** reach production.
- [ ] Environment variables are typed and validated at startup — missing required vars cause an early failure with a clear error, not a silent runtime crash.

---

## 2. SCHEMA & ARCHITECTURE DECISIONS

### 2.1 Primary Key Format
- [ ] **Use `uuid()` across all models.** Vortex convention. Replaces Attireburg's `cuid()`. Every new model added must use `uuid()`.

### 2.2 Admin / Staff Identity — Fully Separate from Customers
- [ ] **`AdminUser` is a completely separate model** from `Customer`. Not a flag, not a role field on the customer table.
- [ ] `AdminUser` has a `role` field: `Admin` | `Manager` | `Support` — enabling tiered staff permissions.
- [ ] Admin authentication and customer authentication are **completely isolated** at the code level. A compromise of one side cannot touch the other.
- [ ] Admin routes are protected by admin-only middleware. Customer session tokens must never grant admin access.

### 2.3 Customer Identity — Guest + Account on Same Record
- [ ] `Customer` model supports both guest checkout and registered accounts via **nullable `passwordHash`** field.
- [ ] A guest customer record is created at checkout (or retrieved by email/phone). `passwordHash` is null until they register.
- [ ] If a guest later registers, their password is added to their **existing** Customer record — no duplicate record created, no order history fragmentation.

### 2.4 Guest Checkout — Email Matches Existing Account
- [ ] **Do NOT auto-login the guest.** Auto-login using a known email is an account takeover vector.
- [ ] **Do NOT block or hard-error the checkout.** This abandons the order at the highest-value moment.
- [ ] **Correct flow:** Let the guest checkout complete. Flag the order internally (`guestOrderPossiblyLinked: true` or equivalent). Send a follow-up email offering to link the order to their existing account.

### 2.5 Order Status — Dual Status Fields (Vortex Pattern)
- [ ] `Order` has **two separate status fields:**
  - `paymentStatus`: `Unpaid` | `Paid` | `Refunded`
  - `fulfillmentStatus`: `Unfulfilled` | `Fulfilled` | `Returned`
- [ ] **No single combined `status` enum.** The Attireburg single-status pattern is superseded.

### 2.6 OrderItem — Snapshot at Purchase Time
- [ ] `OrderItem` stores **snapshotted** product name, variant title, and SKU at the time of purchase.
- [ ] These snapshot fields are immutable after order creation.
- [ ] If a product is renamed, repriced, or deleted after purchase, the order history remains correct. This is non-negotiable for data integrity.

### 2.7 Settings / Store Config — Key-Value Model (Vortex Pattern)
- [ ] Use Vortex's flexible `Setting` model: `key (String @unique)`, `value (Json)`.
- [ ] **Replace Attireburg's fixed-column `SiteSettings` model entirely.** Fixed-column settings break as config needs grow.
- [ ] Client-specific config (store name, logo, contact info, currency, brand colors, feature flags) is stored here and readable by the app at runtime.
- [ ] Adding a new config key never requires a schema migration.

### 2.8 ProductImage — Separate Table (Vortex Pattern)
- [ ] `ProductImage` is its own model with fields: `id`, `productId` (FK), `variantId` (FK, optional), `url`, `altText`, `position`, `isPrimary`.
- [ ] **Replace Attireburg's plain `images: String[]` array.** The array approach cannot store alt text, sort order, or primary image flags.
- [ ] `altText` is an editable admin field on every image record. Never optional-but-ignored — it must be exposed in the admin UI.

### 2.9 Collections / Categories — Vortex Pattern Adopted
- [ ] Use `Collection` and `CollectionProduct` junction table (Vortex pattern) for grouping products.
- [ ] Collections support both `manual` (admin-curated) and `smart` (rule-based, e.g. tag equals "sale") types.
- [ ] Attireburg's simple `category: String` field on `Product` is replaced by the collection relationship.
- [ ] A standalone `Category` model may still exist for top-level navigation/taxonomy if needed, but product grouping for display/filtering uses `Collection`.

### 2.10 SEO Fields — On Schema Now, Admin UI Later
- [ ] `seoTitle: String?` and `seoDescription: String?` are added to:
  - `Product`
  - `Page`
  - `Category` / `Collection`
  - `BlogArticle`
- [ ] Admin editing UI for these fields is **deferred** for now — the fields must exist in the schema from day one.

### 2.11 Payment Gateway Abstraction Layer
- [ ] A payment adapter interface/module is built before any payment method is wired up.
- [ ] The interface defines a contract: `initiatePayment()`, `capturePayment()`, `refundPayment()`, `getPaymentStatus()` (or equivalent).
- [ ] COD and the first gateway (e.g. PayPal) are the initial implementations of this interface.
- [ ] Adding JazzCash, Easypaisa, Stripe, etc. per future client = implementing the interface only. Checkout logic does not change.
- [ ] Payment method type is stored per-order. No payment-gateway-specific fields are embedded in the `Order` model directly — use a `paymentMeta: Json?` field for gateway-specific data.

### 2.12 Config-Driven Template Architecture
- [ ] This project is a **reusable deployment template**, not a one-off site.
- [ ] Every client-specific value **must** come from `Setting` (runtime DB config) or the theme tokens file (deploy-time config).
- [ ] Items that must be config-driven: store name, tagline, logo URL, brand colors, contact info (email, phone, address), currency code, social links, shipping thresholds, tax rate.
- [ ] Changing a client's entire visual identity is a config change — zero code changes required.
- [ ] **No hardcoded client-specific strings, values, or assets anywhere in the codebase.**

### 2.13 Excluded Schema Models (Not Built in Base Product)
The following models from the reference projects are **excluded** from the base merged schema. They are future paid add-ons per client:
- `AccountingExpense`, `AdSpend`, `OwnerTransaction`, `PostexSettlement`, `FulfillmentCost`, `SkuCostHistory` — full accounting/P&L layer
- `Shipment`, `TrackingEvent` — PostEx/courier API integration
- `AnalyticsEvent` — server-side pixel/analytics events model
- `LegalContent` (Attireburg) — bilingual DE/EN legal CMS — client-specific, not generic

---

## 3. FEATURE SCOPE — INCLUDED VS. EXCLUDED

### 3.1 Included in Base Product

These features are built as part of the merged base template:

#### From Attireburg
- [ ] Customer accounts & self-service portal (profile, saved addresses, order history)
- [ ] Wishlist (saved products per customer)
- [ ] Shopping cart with guest + logged-in state synchronization
- [ ] Backorder / out-of-stock waitlist system + restock notification emails
- [ ] Newsletter subscription capture
- [ ] Customer contact form & message inbox in admin
- [ ] Granular product configuration (variants, sizes, colors, SKU, weight, stock per variant)
- [ ] Coupon & promotional discount engine (percentage + fixed, usage caps, expiry)
- [ ] Transactional emails (order confirmation, shipping notification, password reset, restock alert)
- [ ] PDF invoice generation per order
- [ ] COD + PayPal payment support (via abstracted payment interface)

#### From Vortex Rings
- [ ] Separate `AdminUser` auth with role-based access (`Admin` / `Manager` / `Support`)
- [ ] Collections (product grouping — manual and smart/rule-based)
- [ ] `ProductImage` table with alt text, sort order, primary flag
- [ ] Slide-out cart drawer & streamlined checkout modal flow
- [ ] Abandoned checkout capture
- [ ] Customer reviews & star ratings with admin moderation controls
- [ ] Blog articles (CMS)
- [ ] Custom static pages (CMS) with slug-based routing
- [ ] FAQ page / accordion
- [ ] Flexible key-value `Setting` store
- [ ] Admin-editable store content, branding (logo, colors) via config — no code changes required

#### New in Merged Product
- [ ] Payment gateway abstraction interface
- [ ] Centralized theme/design tokens config file
- [ ] SEO fields on Product, Page, Category, BlogArticle (schema level)
- [ ] Tracking hooks (Meta Pixel, GA4) wired per feature as built
- [ ] Structural SEO infrastructure (sitemap, robots.txt, canonicals, breadcrumbs, 404/500 pages)

### 3.2 Explicitly Excluded — Future Paid Add-ons Per Client

These are **not** built into the base product. They are added per-client as paid add-ons:
- Full Accounting & P&L system (COGS, OpEx, ad spend, owner equity, CPR settlement reconciliation)
- Third-party courier API integration (PostEx booking, CN generation, webhooks, live tracking)
- Meta Pixel server-side Conversions API (full server-to-server event tracking)
- Dedicated SEO management admin UI (per-page meta field editor, alt text editor, sitemap controls)
- Bilingual (DE/EN) i18n / localization system

### 3.3 Pricing Model (Current)
- [ ] **One-time flat fee only. No subscription.**
- [ ] Pitch: "Shopify-equivalent power, zero monthly fee."
- [ ] The tiered subscription model (Basic / Premium / Premium Plus) from the plan doc is **suspended** — not the current build target. It remains in the plan doc for reference only.
- [ ] Optional future consideration: paid support/maintenance add-on alongside the one-time build fee, never breaking the "no subscription" core pitch.

---

## 4. QUALITY STANDARDS

### 4.1 OWASP Security — Applied As Built, Not Audited After
- [ ] **Input validation on every form and API route.** Validate on client, re-validate on server. Never trust client input.
- [ ] **Access control check on every protected route** — both admin and customer-facing. No route assumes the caller is authenticated; it verifies.
- [ ] **Safe handling of all user data:** passwords are always hashed (bcrypt), PII is not logged, tokens are short-lived and stored in HTTP-only cookies.
- [ ] **No raw SQL or unparameterized queries.** Prisma ORM provides parameterization — never bypass it.
- [ ] **CSRF protection** on all state-mutating routes.
- [ ] **Rate limiting** on auth endpoints (login, register, forgot password) to prevent brute-force.
- [ ] **Environment variables** for all secrets — never committed to git, never hardcoded.
- [ ] Security is part of "done" for every feature. It is not a later audit pass.

### 4.2 Mobile-First Responsiveness — Part of "Done" for Every Feature
- [ ] Every feature is checked on both **mobile and desktop** as it is built.
- [ ] Mobile is designed first; desktop is the expansion, not the reverse.
- [ ] **No overlapping elements** at any viewport width.
- [ ] **No edge-to-edge content** without appropriate padding/breathing room at all breakpoints.
- [ ] **Product grids:** 2 columns on mobile (or horizontal scrollable carousel — appropriate to context). Never a single oversized column.
- [ ] Proper `padding` and `spacing` at all breakpoints — explicitly tested on small screens.
- [ ] Touch targets (buttons, links) meet minimum size guidelines (44×44px recommended).
- [ ] Mobile responsiveness is part of the definition of "done" for each feature. Not a cleanup pass.

### 4.3 Structural SEO & Site Hygiene — Built In from Day One
- [ ] **`sitemap.xml`:** Auto-generated, covering all product, collection, blog, and page routes. Updated dynamically.
- [ ] **`robots.txt`:** Present and correctly configured (allow storefront, disallow admin).
- [ ] **Canonical URLs:** `<link rel="canonical">` on every page.
- [ ] **Slug-based routing throughout:** All URLs use clean, meaningful slugs. No `?id=123`, no `#hash` navigation for pages.
- [ ] **Custom 404 page:** Branded, helpful, not the framework default.
- [ ] **Custom 500 page:** Branded, not a raw error dump.
- [ ] **`altText` on every image:** The field exists in the schema. It is exposed as an editable admin field. It is rendered as the `alt` attribute on every `<img>` tag — never left blank or set to a filename.
- [ ] **One `<h1>` per page, proper heading hierarchy** (h1 -> h2 -> h3, no skipping levels). Enforced as a coding standard throughout, not audited at the end.
- [ ] **Breadcrumbs component:** Reusable, used on all product, collection, blog, and page routes.
- [ ] **Favicon:** Set and present.
- [ ] **Mobile viewport meta tag:** `<meta name="viewport" content="width=device-width, initial-scale=1">` present in the root layout.
- [ ] **Open Graph tags** (`og:title`, `og:description`, `og:image`) on all public pages.

### 4.4 Analytics & Conversion Tracking Hooks — Wired Vertically, Not Retroactively
- [ ] Tracking hooks for **Meta Pixel** and **GA4** are wired into each feature **as it is built**, not added afterward.
- [ ] Events to instrument: `PageView`, `AddToCart`, `InitiateCheckout`, `Purchase`.
- [ ] Pixel ID, GA4 Measurement ID, and Conversions API token are stored in `Setting` — never hardcoded.
- [ ] A `track()` or equivalent utility function is the single call point for all events across the app. Never call the pixel/analytics SDK directly inline in feature code.
- [ ] Tracking calls are **non-blocking** — they must never delay or break the primary user action (add to cart, checkout, purchase).
- [ ] GA4 and Meta Pixel integrations are both client-side hooks. Full server-side Conversions API integration is a future paid add-on (excluded from base).

### 4.5 Performance Baseline
- [ ] Images are served in modern formats (WebP preferred) with defined width/height attributes to prevent layout shift.
- [ ] No synchronous blocking operations in route handlers that can be deferred.
- [ ] Avoid unnecessary full-page data fetches — fetch only what the current page/component needs.
- [ ] No N+1 query patterns. Use Prisma `include` or batch queries appropriately.

### 4.6 Accessibility Baseline
- [ ] All interactive elements (buttons, links, form fields) are keyboard-navigable.
- [ ] All form fields have associated `<label>` elements.
- [ ] Color contrast meets WCAG AA minimum.
- [ ] Error states are communicated via text, not color alone.
- [ ] Modals and drawers trap focus correctly and are dismissible via keyboard (Escape key).

### 4.7 Code Consistency
- [ ] TypeScript strict mode enabled. No `any` types without explicit justification.
- [ ] Shared types for all domain objects (Product, Order, Customer, etc.) in a `/types` directory — used by both frontend and API layers.
- [ ] Shared validation schemas (e.g. Zod) in a `/lib/validation` directory — reused between client and server.
- [ ] No magic strings for statuses, roles, or event names — use TypeScript enums or `const` maps.
- [ ] No dead code left in the codebase. Remove commented-out blocks before merging to `main`.

### 4.8 Universal Graceful Error Handling (Permanent Standing Rule)
- [ ] **Structured API Error Shape**: Every API route handler MUST return a structured JSON response `{ error: string, details?: any }` on failure with appropriate HTTP status codes (400, 401, 403, 404, 409, 413, 429, 500). Raw stack traces, SQL errors, or platform HTML pages must NEVER be sent in API response bodies; log them server-side and provide clean, masked client messages.
- [ ] **Safe Frontend Fetch Handling**: All client-side fetch calls and form submissions MUST use safe response parsing (via `safeFetch` from `@/lib/apiClient` or try/catch around `.text()` and `JSON.parse`). Never assume a response is valid JSON or that status is 2xx. Raw crashes like `SyntaxError: Unexpected token` are strictly forbidden.
- [ ] **Actionable & Specific User Messaging**: User-facing error alerts must be human-readable, specific, and actionable (e.g. "Image exceeds 50MB limit" or "Please choose a unique product slug") while hiding internal implementation details (file paths, database table names, JWT signatures).

---

## FEATURE "DONE" CHECKLIST

Before marking any feature complete, confirm all of the following:

- [ ] UI, route, and backend logic all built and connected end-to-end
- [ ] Feature appears in `FEATURE_CHECKLIST.md` with status `Connected`
- [ ] `ARCHITECTURE.md` updated if new files/routes were added
- [ ] `SCHEMA.md` updated if any model was added or changed
- [ ] Input validation present on all form fields (client + server)
- [ ] Access control verified for protected routes
- [ ] All `altText` fields exposed and rendered on images in this feature
- [ ] Tracking hook wired (`AddToCart`, `InitiateCheckout`, `Purchase`, as applicable)
- [ ] SEO: canonical URL, heading hierarchy, breadcrumbs applied (storefront pages)
- [ ] Tested on mobile viewport — layout correct, no overlaps, proper spacing
- [ ] Tested on desktop viewport — layout correct
- [ ] Edge cases tested: empty state, invalid input, missing data
- [ ] No hardcoded client-specific values introduced

---

*Sources: `awweb-saas-merger-plan.md` Sections 1, 4, 5, 6, 6.1, 7, 8 (Handoff Instructions); confirmed additional requirements from session on 2026-08-19.*
*Last updated: 2026-08-19*
