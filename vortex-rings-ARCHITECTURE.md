# Application Architecture Documentation

This document outlines the major architectural components and features of the **Vortex Rings** e-commerce platform built with **Next.js (App Router)**, **TypeScript**, **Tailwind CSS**, and **Prisma ORM (PostgreSQL)**.

---

## High-Level Architecture Overview

```
                        ┌─────────────────────────┐
                        │ Next.js App (App Router) │
                        └────────────┬────────────┘
                                     │
           ┌─────────────────────────┼─────────────────────────┐
           │                         │                         │
┌──────────▼──────────┐   ┌──────────▼──────────┐   ┌──────────▼──────────┐
│ Storefront Routes   │   │   Admin Dashboard   │   │  API Route Handlers │
│ app/(storefront)    │   │      app/admin      │   │       app/api       │
└──────────┬──────────┘   └──────────┬──────────┘   └──────────┬──────────┘
           │                         │                         │
           └─────────────────────────┼─────────────────────────┘
                                     │
                 ┌───────────────────┼───────────────────┐
                 │                   │                   │
         ┌───────▼───────┐   ┌───────▼───────┐   ┌───────▼───────┐
         │ React Context │   │ Third-Party   │   │  Prisma ORM   │
         │ & UI Drivers  │   │ (PostEx, Meta)│   │  (PostgreSQL) │
         └───────────────┘   └───────────────┘   └───────────────┘
```

---

## Major Features & Code Mapping

### 1. Products & Catalog Management
Product browsing, variant selections (sizes/colors), dynamic collection filtering, full catalog control in the admin backend.

- Storefront: `app/(storefront)/page.tsx`, `components/storefront/product-catalog.tsx`
- Product Detail: `app/(storefront)/products/[slug]/page.tsx`, `components/storefront/product-detail.tsx`
- Collections: `app/(storefront)/collections/[slug]/page.tsx`
- Size Guide / Restock: `components/storefront/size-guide-modal.tsx`, `components/storefront/restock-form.tsx`
- Admin: `app/admin/(dashboard)/products/page.tsx`
- API: `app/api/admin/products/route.ts`, `app/api/admin/collections/route.ts`, `app/api/inventory/route.ts`

---

### 2. Cart & Checkout Engine
Client-side cart persistence, slide-out drawer, instant checkout modal, abandoned checkout tracking, order placement.

- `lib/cart-context.tsx`, `components/storefront/cart-drawer.tsx`, `components/storefront/checkout-modal.tsx`, `components/storefront/success-modal.tsx`, `components/storefront/urgency-timer.tsx`
- Page: `app/(storefront)/checkout/page.tsx`
- API: `app/api/checkout/route.ts`, `app/api/discounts/validate/route.ts`, `app/api/analytics/abandoned-checkout/route.ts`

---

### 3. Orders, Shipping & Courier Integration (PostEx)
Full fulfillment workflow: admin order processing, PostEx courier API booking, tracking numbers (CN), webhooks, live customer order tracking.

- Admin: `app/admin/(dashboard)/page.tsx`, `app/admin/(dashboard)/shipping/page.tsx`, `components/admin/new-order-listener.tsx`
- Storefront tracking: `app/(storefront)/track-order/page.tsx`
- API: `app/api/orders/route.ts`, `app/api/orders/[id]/route.ts`, `app/api/track-order/route.ts`, `app/api/webhooks/postex/route.ts`

*Note (per merge plan): PostEx-style courier integration dropped from base merged product — future paid add-on.*

---

### 4. Accounting & Financial Management System
OpEx, ad spend, SKU cost history (COGS), owner capital equity, CPR courier payout reconciliation, net profit calculations.

- Docs: `accounting-README.md`
- Admin: `app/admin/(dashboard)/accounting/page.tsx`
- API: `app/api/admin/accounting/expenses/route.ts`, `.../ad-spend/route.ts`, `.../sku-costs/route.ts`, `.../owner-transactions/route.ts`, `.../cpr-settlements/route.ts`, `.../summary/route.ts`

*Note (per merge plan): Full accounting layer dropped from base merged product — future paid add-on.*

---

### 5. Authentication & Security
JWT tokens/passwords for admin routes, customer account login, input sanitization.

- `lib/auth.ts`, `lib/security.ts`
- Storefront login: `app/(storefront)/login/page.tsx`, `app/api/customer/login/route.ts`
- Admin login: `app/admin/login/page.tsx`, `app/api/admin/login/route.ts`

---

### 6. Analytics, Conversions & Meta Pixel Tracking
Conversion funnel metrics (`PageView`, `AddToCart`, `InitiateCheckout`, `Purchase`) client-side and server-side via Conversions API.

- `lib/pixels.ts`, `lib/server-pixels.ts`, `components/storefront/analytics-tracker.tsx`, `components/storefront/pixel-tracker.tsx`
- Admin: `app/admin/(dashboard)/analytics/page.tsx`
- API: `app/api/analytics/events/route.ts`, `app/api/pixels/route.ts`

*Note (per merge plan): Meta Pixel/conversions integration dropped from base merged product — future paid add-on.*

---

### 7. Discounts & Coupon Engine
Fixed/percentage promotional coupon codes, usage caps, minimum spend requirements.

- Admin: `app/admin/(dashboard)/discounts/page.tsx`
- API: `app/api/discounts/validate/route.ts`, `app/api/admin/discounts/route.ts`

---

### 8. Customer Reviews & UGC Moderation
Review submissions, image attachments, star ratings, moderation control before publishing.

- `components/storefront/reviews-carousel.tsx`, review modal embedded in `product-detail.tsx`
- Admin: `app/admin/(dashboard)/reviews/page.tsx`
- API: `app/api/reviews/route.ts`

---

### 9. Content Management & Static Pages (CMS)
Blog posts, legal pages, dynamic store settings, FAQ.

- `app/(storefront)/blog/page.tsx`, `app/(storefront)/blog/[slug]/page.tsx`
- `app/(storefront)/faq/page.tsx`, `components/storefront/faq-accordion.tsx`, `components/storefront/policy-tabs.tsx`
- Admin: `app/admin/(dashboard)/blog/page.tsx`, `app/admin/(dashboard)/settings/page.tsx`

---

### 10. Core Infrastructure & Data Layer
- Schema: `prisma/schema.prisma`
- Prisma clients: `lib/db.ts`, `lib/prisma.ts`
- Seed script: `lib/seed.ts`
- Layouts: `app/layout.tsx`, `app/(storefront)/layout.tsx`, `app/admin/(dashboard)/layout.tsx`, `components/admin/layout-shell.tsx`
- Global CSS: `app/globals.css`
- Config: `next.config.mjs`, `package.json`
