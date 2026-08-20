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

---

## 2. Status Legend
- `Connected`: Fully wired, route handler implemented, database integrated, edge cases verified.
- `Not Connected`: UI scaffolded or route drafted, not yet fully integrated or verified.
