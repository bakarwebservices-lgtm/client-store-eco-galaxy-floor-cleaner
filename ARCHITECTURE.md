# Application Architecture Documentation — Merged SaaS Template

This document outlines the architectural design, directory structure, and domain mappings of the **AWWeb Merged SaaS Template** e-commerce platform. Built with **Next.js (App Router)**, **TypeScript**, **Tailwind CSS**, and **Prisma ORM (PostgreSQL)**.

> **Living Reference:** This document maps every major system area to its actual files and folders. Per `BUILD_STANDARDS.md` section 1.4, update this document immediately whenever new routes, components, or services are added.

---

## 1. High-Level Architecture Overview

```
                        ┌─────────────────────────────────────────┐
                        │      Next.js App Router (TypeScript)    │
                        └────────────────────┬────────────────────┘
                                             │
            ┌────────────────────────────────┼────────────────────────────────┐
            │                                │                                │
 ┌──────────▼──────────┐          ┌──────────▼──────────┐          ┌──────────▼──────────┐
 │  Storefront Routes  │          │   Admin Dashboard   │          │  API Route Handlers │
 │  src/app/(store)    │          │  src/app/(admin)    │          │     src/app/api     │
 └──────────┬──────────┘          └──────────┬──────────┘          └──────────┬──────────┘
            │                                │                                │
            └────────────────────────────────┼────────────────────────────────┘
                                             │
        ┌───────────────────┬────────────────┴───────────────────┬───────────────────┐
        │                   │                                    │                   │
┌───────▼───────┐   ┌───────▼───────┐                    ┌───────▼───────┐   ┌───────▼───────┐
│ React Context │   │ Payment Layer │                    │ Tracking &    │   │  Prisma ORM   │
│ (Cart, Auth,  │   │  Abstraction  │                    │ Analytics Hook│   │ (PostgreSQL)  │
│  Theme tokens)│   │ (COD, Gateways│                    │ (Pixel, GA4)  │   │               │
└───────────────┘   └───────────────┘                    └───────────────┘   └───────────────┘
```

---

## 2. Technical Stack Overview

- **Framework**: [Next.js](https://nextjs.org/) (App Router, React 19 / Server Components, TypeScript strict mode)
- **Database & ORM**: PostgreSQL managed via [Prisma ORM](https://www.prisma.io/)
- **Styling & Design System**: Tailwind CSS paired with centralized theme design tokens (`src/config/theme.config.ts`)
- **Authentication**:
  - **Admin Auth**: Isolated JWT session cookies with bcrypt hashing (`src/lib/auth/admin.ts`)
  - **Customer Auth**: Independent session tokens supporting both registered customers and guest checkout (`src/lib/auth/customer.ts`)
- **Order State Derivation**: Clean dual-status model (`paymentStatus` + `fulfillmentStatus` + `cancelledAt`) with unified state helper (`src/lib/orders/deriveOrderStatus.ts`)
- **Payment Abstraction**: Modular payment adapter interface (`src/lib/payments/types.ts`) with initial COD and gateway implementations
- **Validation**: Centralized Zod schemas (`src/lib/validation/`) shared across client and API routes
- **Tracking & Analytics**: Unified non-blocking event dispatcher (`src/lib/analytics/tracker.ts`) supporting Meta Pixel and GA4

---

## 3. Directory Structure Layout

```
/
├── prisma/
│   └── schema.prisma                 # Core Prisma schema definition (28 models)
├── src/
│   ├── app/
│   │   ├── (store)/                  # Public Storefront Route Group
│   │   │   ├── layout.tsx            # Storefront shell (Navbar, CartDrawer, Footer)
│   │   │   ├── page.tsx              # Storefront Homepage
│   │   │   ├── products/
│   │   │   │   ├── page.tsx          # Catalog listing, sorting & multi-faceted filtering
│   │   │   │   └── [slug]/page.tsx   # Product Detail Page (PDP)
│   │   │   ├── collections/[slug]/   # Dynamic collection catalog view
│   │   │   ├── categories/[slug]/    # Category navigation view
│   │   │   ├── cart/page.tsx         # Full cart view
│   │   │   ├── checkout/page.tsx     # Streamlined multi-step checkout
│   │   │   ├── account/              # Customer Portal
│   │   │   │   ├── page.tsx          # Account dashboard & profile
│   │   │   │   ├── orders/page.tsx   # Order history & status
│   │   │   │   ├── addresses/        # Saved addresses management
│   │   │   │   └── wishlist/page.tsx # Saved wishlist items
│   │   │   ├── blog/
│   │   │   │   ├── page.tsx          # Blog listing
│   │   │   │   └── [slug]/page.tsx   # Blog post reader
│   │   │   ├── pages/[slug]/page.tsx # CMS static page reader
│   │   │   ├── faq/page.tsx          # Interactive FAQ accordion
│   │   │   ├── contact/page.tsx      # Contact form
│   │   │   ├── login/page.tsx        # Customer login
│   │   │   ├── register/page.tsx     # Customer registration
│   │   │   ├── forgot-password/      # Password reset flow
│   │   │   ├── sitemap.ts            # Dynamic SEO sitemap generator
│   │   │   ├── robots.ts             # SEO robots.txt configuration
│   │   │   ├── not-found.tsx         # Branded custom 404
│   │   │   └── error.tsx             # Branded custom 500 error boundary
│   │   ├── (admin)/                  # Role-Protected Admin Dashboard Route Group
│   │   │   ├── layout.tsx            # Admin shell (Sidebar, Header, Breadcrumbs)
│   │   │   ├── admin/
│   │   │   │   ├── page.tsx          # Operations Dashboard & Key Metrics
│   │   │   │   ├── products/         # Product catalog management
│   │   │   │   ├── collections/      # Collection manager (Manual & Smart)
│   │   │   │   ├── categories/       # Category navigation hierarchy
│   │   │   │   ├── orders/           # Order fulfillment & status workflow
│   │   │   │   ├── customers/        # Customer CRM & address inspection
│   │   │   │   ├── coupons/          # Coupon & promotion manager
│   │   │   │   ├── reviews/          # Review moderation queue
│   │   │   │   ├── waitlist/         # Out-of-stock subscriptions & restock planner
│   │   │   │   ├── blog/             # Blog article editor
│   │   │   │   ├── pages/            # CMS static page editor
│   │   │   │   ├── faq/              # FAQ manager
│   │   │   │   ├── messages/         # Inbound contact messages inbox
│   │   │   │   ├── media/            # Central media asset manager with alt text
│   │   │   │   ├── settings/         # Store branding, colors, & settings config
│   │   │   │   └── staff/            # AdminUser management & role assignment
│   │   │   └── admin/login/page.tsx  # Admin login portal
│   │   └── api/                      # API Route Handlers
│   │       ├── auth/
│   │       │   ├── admin/            # Admin login, logout, me
│   │       │   └── customer/         # Customer login, register, me, logout
│   │       ├── products/             # Product public CRUD & query
│   │       ├── collections/          # Collection query & filter
│   │       ├── categories/           # Category query
│   │       ├── cart/                 # Cart add, update, remove, sync
│   │       ├── wishlist/             # Wishlist toggle & list
│   │       ├── checkout/             # Order creation & abandoned checkout tracking
│   │       ├── orders/               # Order query & status update
│   │       ├── payments/             # Abstracted payment gateway webhooks/capture
│   │       ├── coupons/              # Coupon validation & application
│   │       ├── reviews/              # Review submission & moderation
│   │       ├── waitlist/             # Waitlist subscription & alert triggers
│   │       ├── contact/              # Contact form submission
│   │       ├── newsletter/           # Newsletter subscription
│   │       ├── settings/             # Settings read & update
│   │       ├── upload/               # Media upload handler (alt text required)
│   │       └── tracking/             # Client event tracking proxy
│   ├── components/
│   │   ├── ui/                       # Shared atomic UI components (Button, Modal, Card, Input)
│   │   ├── storefront/               # Storefront components (ProductCard, CartDrawer, Breadcrumbs)
│   │   └── admin/                    # Admin components (DataTable, StatusBadge, ImageUploadModal)
│   ├── contexts/
│   │   ├── CartContext.tsx           # Cart state & sync provider
│   │   ├── CustomerAuthContext.tsx   # Customer session provider
│   │   └── ThemeContext.tsx          # Dynamic theme tokens provider
│   ├── lib/
│   │   ├── db.ts                     # Prisma client singleton instance
│   │   ├── auth/                     # JWT session utilities & password hashing
│   │   ├── orders/
│   │   │   └── deriveOrderStatus.ts  # Unified helper to derive high-level order state
│   │   ├── payments/                 # Abstracted Payment Gateway Adapter Interface
│   │   │   ├── types.ts              # IPaymentGateway interface & types
│   │   │   ├── registry.ts           # Gateway registry
│   │   │   └── adapters/             # COD & PayPal adapters
│   │   ├── validation/               # Zod validation schemas for all inputs
│   │   ├── analytics/                # Non-blocking tracking hooks (Pixel & GA4)
│   │   ├── email/                    # Transactional email service & HTML templates
│   │   └── pdf/                      # Invoice PDF generator
│   ├── config/
│   │   └── theme.config.ts           # Centralized theme tokens definition (colors, fonts, radii)
│   └── types/                        # Shared TypeScript types and interfaces
```

---

## 4. Major Feature Domain Mapping

### 4.1 Products & Catalog Management
- **Storefront Pages**: `src/app/(store)/products/page.tsx`, `src/app/(store)/products/[slug]/page.tsx`
- **Admin Pages**: `src/app/(admin)/admin/products/page.tsx`, `src/app/(admin)/admin/products/[id]/page.tsx`
- **Components**: `src/components/storefront/ProductGrid.tsx`, `src/components/storefront/ProductCard.tsx`, `src/components/storefront/VariantSelector.tsx`
- **API Endpoints**: `src/app/api/products/route.ts`, `src/app/api/products/[id]/route.ts`
- **Validation**: `src/lib/validation/product.ts`

### 4.2 Collections & Navigation Categories
- **Storefront Pages**: `src/app/(store)/collections/[slug]/page.tsx`, `src/app/(store)/categories/[slug]/page.tsx`
- **Admin Pages**: `src/app/(admin)/admin/collections/page.tsx`, `src/app/(admin)/admin/categories/page.tsx`
- **API Endpoints**: `src/app/api/collections/route.ts`, `src/app/api/categories/route.ts`

### 4.3 Shopping Cart & Wishlist
- **Storefront Components**: `src/components/storefront/CartDrawer.tsx`, `src/app/(store)/cart/page.tsx`
- **Context**: `src/contexts/CartContext.tsx`
- **API Endpoints**: `src/app/api/cart/route.ts`, `src/app/api/wishlist/route.ts`
- **Tracking Hook**: `AddToCart` event dispatched on addition

### 4.4 Checkout & Orders Engine
- **Storefront Pages**: `src/app/(store)/checkout/page.tsx`, `src/app/(store)/account/orders/[id]/page.tsx`
- **Admin Pages**: `src/app/(admin)/admin/orders/page.tsx`, `src/app/(admin)/admin/orders/[id]/page.tsx`
- **API Endpoints**: `src/app/api/checkout/route.ts`, `src/app/api/orders/route.ts`
- **Services**: `src/lib/orders/deriveOrderStatus.ts`, `src/lib/payments/`, `src/lib/pdf/InvoicePDF.tsx`, `src/lib/email/OrderStatusEmail.tsx`
- **Tracking Hook**: `InitiateCheckout` on checkout view, `Purchase` on order creation

### 4.5 Payment Gateway Abstraction Layer
- **Architecture**: `src/lib/payments/types.ts` defines `IPaymentGateway` contract (`initiatePayment`, `capturePayment`, `refundPayment`)
- **Implementations**:
  - `src/lib/payments/adapters/CodAdapter.ts` (Cash on Delivery)
  - `src/lib/payments/adapters/PaypalAdapter.ts` (PayPal capture/validation)
- **Extensibility**: Adding JazzCash, Easypaisa, or Stripe requires only implementing `IPaymentGateway` and registering in `registry.ts`

### 4.6 Customer Account Management
- **Storefront Pages**: `src/app/(store)/account/page.tsx`, `src/app/(store)/login/page.tsx`, `src/app/(store)/register/page.tsx`
- **Admin Pages**: `src/app/(admin)/admin/customers/page.tsx`
- **Context**: `src/contexts/CustomerAuthContext.tsx`
- **API Endpoints**: `src/app/api/auth/customer/`

### 4.7 Staff & Admin Administration
- **Admin Pages**: `src/app/(admin)/admin/page.tsx`, `src/app/(admin)/admin/staff/page.tsx`
- **Security**: Role-based access control (`AdminRole`: `ADMIN`, `MANAGER`, `SUPPORT`) enforced in `src/middleware.ts`
- **API Endpoints**: `src/app/api/auth/admin/`

### 4.8 Content Management (Blog, CMS Pages, FAQ)
- **Storefront Pages**: `src/app/(store)/blog/`, `src/app/(store)/pages/[slug]/`, `src/app/(store)/faq/`
- **Admin Pages**: `src/app/(admin)/admin/blog/`, `src/app/(admin)/admin/pages/`, `src/app/(admin)/admin/faq/`
- **API Endpoints**: `src/app/api/blog/`, `src/app/api/pages/`, `src/app/api/faq/`

### 4.9 Reviews & Customer Feedback
- **Storefront Components**: `src/components/storefront/ReviewList.tsx`, `src/components/storefront/ReviewForm.tsx`
- **Admin Pages**: `src/app/(admin)/admin/reviews/page.tsx` (Moderation approval queue)
- **API Endpoints**: `src/app/api/reviews/route.ts`

### 4.10 Backorder & Restock System
- **Storefront Components**: `src/components/storefront/WaitlistForm.tsx`
- **Admin Pages**: `src/app/(admin)/admin/waitlist/page.tsx`
- **API Endpoints**: `src/app/api/waitlist/route.ts`
- **Services**: `src/lib/email/RestockAlertEmail.tsx`

### 4.11 Store Settings & Centralized Theme Tokens
- **Design Tokens**: `src/config/theme.config.ts` (colors, typography, radii)
- **Runtime Settings**: Managed via `Setting` key-value store (`src/app/api/settings/route.ts`)
- **Admin Pages**: `src/app/(admin)/admin/settings/page.tsx` (Live store branding & token preview)

### 4.12 Media Asset Management
- **Admin Pages**: `src/app/(admin)/admin/media/page.tsx`
- **Components**: `src/components/admin/MediaUploadModal.tsx` (enforces alt text entry)
- **API Endpoints**: `src/app/api/upload/route.ts`

---

## 5. Build Standards Compliance Matrix

| Requirement / Standard | Implementation Mechanism | Verification Point |
| :--- | :--- | :--- |
| **Vertical Feature Building** | UI + Route + Logic built simultaneously | `FEATURE_CHECKLIST.md` tracking |
| **Template Config Architecture** | `Setting` table + `theme.config.ts` | Zero hardcoded client values in code |
| **Payment Abstraction** | `IPaymentGateway` adapter pattern | Pluggable interface in `src/lib/payments/` |
| **Dual Order Status** | `paymentStatus` + `fulfillmentStatus` + `cancelledAt` | Helper `deriveOrderStatus.ts` (no duplicate status storage) |
| **Regional Independence** | `store.country` & `store.currency` in `Setting` | No DB-level currency/country defaults |
| **SEO Hygiene** | Sitemap, robots, canonicals, breadcrumbs, 404/500 | Standard components & Next.js metadata |
| **Image Alt Text** | `altText` required in `ProductImage` & `MediaAsset` | Rendered on all `<img>` tags |
| **OWASP Security** | Server Zod validation, HTTP-only cookies, isolated admin auth | Auth helpers & route middleware |
| **Mobile-First Responsiveness** | 2-column product grids on mobile, tested spacing | Viewport testing before feature signoff |
| **Analytics Hooks** | Non-blocking `track()` dispatcher for Pixel & GA4 | Embedded in Cart, Checkout, Purchase flows |
