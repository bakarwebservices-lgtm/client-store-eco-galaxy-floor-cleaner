# Living Feature Connection Checklist

This document tracks every UI element, intended action, route handler, and its end-to-end connection status throughout the build process.

> **Rule (BUILD_STANDARDS.md 1.2):** Every feature must be built vertically (UI + Route + Logic together) and verified end-to-end. Nothing is left half-wired silently. Update this table after every feature is completed.

---

## 1. Feature Connection Matrix

| Feature Domain | Element / Component | Intended Action | Route / Handler | Status |
| :--- | :--- | :--- | :--- | :--- |
| **Scaffold** | Project Base | Initialize Next.js, Prisma client, theme tokens & env | N/A | `Connected` |
| **Admin Auth** | Login Form (`src/app/(admin)/admin/login/page.tsx`) | Submit credentials, rate-limit, authenticate against AdminUser, issue HTTP-only JWT cookie | `POST /api/auth/admin/login` | `Connected` |
| **Admin Auth** | Route Protection (`src/middleware.ts`) | Verify JWT cookie on all `/admin/*` routes; redirect unauthenticated requests to `/admin/login` | Middleware | `Connected` |
| **Admin Auth** | Session Inspector | Verify active admin session from cookies and return staff payload | `GET /api/auth/admin/me` | `Connected` |
| **Admin Auth** | Logout Button (`src/app/(admin)/admin/page.tsx`) | Clear HTTP-only session cookie and redirect to login | `POST /api/auth/admin/logout` | `Connected` |
| **Admin Auth** | Seed Script (`prisma/seed.ts`) | Create / reset initial `AdminUser` with generated random password | Database Seeder | `Connected` |
| **Products (Storefront)** | Product Catalog Grid (`src/app/(store)/products/page.tsx`) | Paginated product listing, 2-col mobile grid, category filter pills, sorting | `GET /api/products` | `Connected` |
| **Products (Storefront)** | Product Detail View (`src/app/(store)/products/[slug]/page.tsx`) | Display product, breadcrumbs, JSON-LD schema, canonical tags, responsive gallery | `GET /api/products/[id]` | `Connected` |
| **Products (Storefront)** | Variant Selector (`src/components/storefront/VariantSelector.tsx`) | Select variant SKU, dynamically update price, stock indicators, and variant image | Client state & cart bridge | `Connected` |
| **Products (Storefront)** | Product Gallery (`src/components/storefront/ProductGallery.tsx`) | Interactive image viewer with required `altText` rendered on every `<img>` | Client gallery component | `Connected` |
| **Products (Admin)** | Product Table View (`src/app/(admin)/admin/products/page.tsx`) | Search, filter by status, view SKU count, edit link, soft-delete archive trigger | `GET /api/products?admin=true` | `Connected` |
| **Products (Admin)** | Product Create Form (`src/app/(admin)/admin/products/new/page.tsx`) | Validate via Zod, create Product + ProductVariant[] + ProductImage[] + Categories | `POST /api/products` | `Connected` |
| **Products (Admin)** | Product Edit Form (`src/app/(admin)/admin/products/[id]/page.tsx`) | Update product fields, manage variants matrix, image gallery, SEO metadata | `PUT /api/products/[id]` | `Connected` |
| **Products (Admin)** | Product Soft Delete | Soft delete product via `deletedAt` timestamp and `ARCHIVED` status (never hard delete) | `DELETE /api/products/[id]` | `Connected` |
| **Media Management** | Storage Adapter Abstraction (`src/lib/storage/*`) | Interface `IStorageAdapter`, `LocalStorageAdapter`, and `StorageRegistry` singleton | Storage Layer | `Connected` |
| **Media Management** | File Upload API (`src/app/api/upload/route.ts`) | Accept image file & mandatory `altText`, validate MIME/size, upload via adapter, create `MediaAsset` | `POST /api/upload` | `Connected` |
| **Media Management** | Media Library API (`src/app/api/media/route.ts`) | Paginated, searchable media asset queries for admin library & pickers | `GET /api/media` | `Connected` |
| **Media Management** | Media Item API (`src/app/api/media/[id]/route.ts`) | Edit `altText` metadata or delete asset and purge physical file via adapter | `PATCH/DELETE /api/media/[id]` | `Connected` |
| **Media Management** | Media Upload & Picker Modal (`src/components/admin/MediaUploadModal.tsx`) | Reusable dialog for choosing from library or uploading with mandatory `altText` | Client modal component | `Connected` |
| **Media Management** | Admin Media Page (`src/app/(admin)/admin/media/page.tsx`) | Full media browser, search, copy URL, edit alt text, delete asset, trigger upload modal | `GET /admin/media` | `Connected` |
| **Products (Retrofit)** | Image Manager in Product Form (`src/components/admin/ProductForm.tsx`) | Integrated with `MediaUploadModal`, enforcing altText and cover image selection | Admin Product Form | `Connected` |
| **Shopping Cart** | Cart Context & Hook (`src/context/CartContext.tsx`) | Manage global cart state, item quantities, total calculation, and drawer toggle | Client Context | `Connected` |
| **Shopping Cart** | Cart Drawer (`src/components/storefront/CartDrawer.tsx`) | Slide-out cart overlay with live steppers, remove triggers, and checkout CTA | Storefront Drawer | `Connected` |
| **Shopping Cart** | Dedicated Cart Page (`src/app/(store)/cart/page.tsx`) | Full cart view with free shipping progress bar and order summary breakdown | `GET /cart` | `Connected` |
| **Shopping Cart** | Cart API Route (`src/app/api/cart/route.ts`) | Dual guest/customer cart resolution, add item with inventory cap, clear cart | `GET/POST/DELETE /api/cart` | `Connected` |
| **Shopping Cart** | Cart Item API (`src/app/api/cart/items/[id]/route.ts`) | Update quantity with stock validation or delete item | `PATCH/DELETE /api/cart/items/[id]` | `Connected` |
| **Shopping Cart** | Cart Merge API (`src/app/api/cart/merge/route.ts`) | Merge guest session items into customer account cart with live stock clamp | `POST /api/cart/merge` | `Connected` |
| **Shopping Cart** | AddToCart Tracking Hook (`src/lib/tracking/events.ts`) | Non-blocking analytics dispatcher (`track('AddToCart', ...)`) on item addition | Analytics Dispatcher | `Connected` |
| **Checkout & Payments** | Payment Gateway Abstraction (`src/lib/payments/*`) | Interface `IPaymentGateway`, `CodPaymentGateway`, and `PaymentGatewayRegistry` | Payment Layer | `Connected` |
| **Checkout & Payments** | Coupon Validation API (`src/app/api/coupons/validate/route.ts`) | Validate code, min order amount, max uses, and calculate discount percentage/fixed | `POST /api/coupons/validate` | `Connected` |
| **Checkout & Payments** | Order Creation API (`src/app/api/checkout/route.ts`) | Atomic transaction: inventory deduction, immutable snapshot OrderItem, guest linking | `POST /api/checkout` | `Connected` |
| **Checkout & Payments** | Order Query API (`src/app/api/orders/[id]/route.ts`) | Query complete order by UUID or orderNumber with snapshot lines & shipping address | `GET /api/orders/[id]` | `Connected` |
| **Checkout & Payments** | Storefront Checkout Page (`src/app/(store)/checkout/page.tsx`) | Shipping address form, coupon code validation box, COD selector, InitiateCheckout hook | `GET /checkout` | `Connected` |
| **Checkout & Payments** | Order Confirmation View (`src/app/(store)/checkout/success/[id]/page.tsx`) | Order confirmation receipt, snapshot summary, Purchase tracking hook trigger | `GET /checkout/success/[id]` | `Connected` |
| **Admin Orders** | Admin Order List Page (`src/app/(admin)/admin/orders/page.tsx`) | Filter orders by payment & fulfillment status, search by customer/orderNumber | `GET /api/admin/orders` | `Connected` |
| **Admin Orders** | Admin Order Detail View (`src/app/(admin)/admin/orders/[id]/page.tsx`) | Update independent payment & fulfillment statuses, edit internal staff notes | `GET/PATCH /api/admin/orders/[id]` | `Connected` |
| **Admin Orders** | Cancel Order & Reverse Stock (`/api/admin/orders/[id]/cancel`) | Mark order cancelled and atomically restore line-item quantities to ProductVariant stock | `POST /api/admin/orders/[id]/cancel` | `Connected` |
| **Customer Auth** | Customer Register (`src/app/(store)/account/register/page.tsx`) | Register with bcrypt password, rate-limit protection, create/upgrade Customer, set JWT | `POST /api/auth/customer/register` | `Connected` |
| **Customer Auth** | Customer Login (`src/app/(store)/account/login/page.tsx`) | Verify credentials, rate-limit, issue HTTP-only customer session JWT cookie | `POST /api/auth/customer/login` | `Connected` |
| **Customer Auth** | Customer Session Protection (`src/middleware.ts`) | Guards `/account/*` routes with customer session token validation & redirection | Middleware | `Connected` |
| **Customer Auth** | Customer Logout | Clear customer session cookie | `POST /api/auth/customer/logout` | `Connected` |
| **Customer Account** | Customer Dashboard (`src/app/(store)/account/page.tsx`) | Dashboard overview with profile summary, quick links, and recent orders | `GET /account` | `Connected` |
| **Customer Account** | Customer Order History (`src/app/(store)/account/orders/page.tsx`) | Scoped order list querying only orders where `customerId === session.customerId` | `GET /api/customer/orders` | `Connected` |
| **Customer Account** | Customer Order Detail (`src/app/(store)/account/orders/[id]/page.tsx`) | View customer's order receipt and shipping address snapshot (scoped to customerId) | `GET /api/customer/orders/[id]` | `Connected` |
| **Customer Account** | Address Book Management (`src/app/(store)/account/addresses/page.tsx`) | Full CRUD for customer saved addresses with default toggle | `GET/POST/DELETE /api/customer/addresses` | `Connected` |
| **Customer Account** | Profile Settings (`src/app/(store)/account/profile/page.tsx`) | Update personal name and phone number | `PATCH /api/customer/profile` | `Connected` |
| **Reviews (Storefront)** | Product Reviews Display (`src/components/storefront/ProductReviews.tsx`) | Star rating aggregate stats, verified badges, photo lightbox gallery | `GET /api/products/[id]/reviews` | `Connected` |
| **Reviews (Storefront)** | Review Submission Form (`src/components/storefront/ProductReviews.tsx`) | 1-5 star picker, mandatory altText photo upload, verified buyer check, pending moderation | `POST /api/products/[id]/reviews` | `Connected` |
| **Reviews (Admin)** | Moderation Queue (`src/app/(admin)/admin/reviews/page.tsx`) | Moderation tabs (pending, approved, all), search by reviewer/product, quick approve/reject | `GET /api/admin/reviews` | `Connected` |
| **Reviews (Admin)** | Review Status Toggle | Approve or move review back to pending moderation | `PATCH /api/admin/reviews/[id]` | `Connected` |
| **Reviews (Admin)** | Review Deletion | Permanently delete / reject abusive reviews | `DELETE /api/admin/reviews/[id]` | `Connected` |
| **Reviews (Customer)** | Delete Own Review | Access-controlled deletion endpoint allowing customers to remove their own review | `DELETE /api/customer/reviews/[id]` | `Connected` |

---

## 2. Status Legend
- `Connected`: Fully wired, route handler implemented, database integrated, edge cases verified.
- `Not Connected`: UI scaffolded or route drafted, not yet fully integrated or verified.
