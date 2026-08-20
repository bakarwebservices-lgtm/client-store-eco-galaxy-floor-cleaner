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
| **Admin Auth** | Seed Script (`prisma/seed.ts`) | Create / reset initial `AdminUser` (`admin@store.com` / `AdminRole.ADMIN`) | Database Seeder | `Connected` |

---

## 2. Status Legend
- `Connected`: Fully wired, route handler implemented, database integrated, edge cases verified.
- `Not Connected`: UI scaffolded or route drafted, not yet fully integrated or verified.
