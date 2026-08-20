# Application Architecture Documentation

This document outlines the architectural design and module mapping of the **Attireburg Store** application. It details the core features and maps each domain to its corresponding frontend pages, UI components, API endpoints, context providers, and backend services.

---

## Technical Stack Overview

- **Framework**: [Next.js](https://nextjs.org/) (App Router pattern with TypeScript)
- **Database & ORM**: PostgreSQL database managed via [Prisma ORM](https://www.prisma.io/)
- **Styling & UI**: Tailwind CSS, CSS Modules, dynamic responsive layouts
- **Authentication**: JWT-based session cookies with custom password hashing (`bcryptjs`) & middleware protection
- **Internationalization (i18n)**: Bilingual German (`de`) and English (`en`) support
- **State Management**: React Context API (`AuthContext`, `CartContext`, `ToastContext`, `AlertContext`)
- **Email & PDF Generation**: `EmailService` with custom HTML templates and `@react-pdf/renderer` invoice generator

---

## Major Features & File Mapping

### 1. Products & Catalog Management
Provides product listings, search, multi-faceted filtering (category, size, color, sale status), product detail views, variant selection, and inventory tracking.

- **Frontend Pages**:
  - Store Homepage / Featured Catalog: `src/app/page.tsx`
  - Product Listing & Filtering: `src/app/products/page.tsx`
  - Product Detail View: `src/app/products/[id]/page.tsx`
  - Product Search Page: `src/app/search/page.tsx`
- **UI Components**:
  - Search Bar Component: `src/components/SearchInput.tsx`
- **API Endpoints**:
  - Product CRUD & Filtering API: `src/app/api/products/route.ts`
  - Individual Product API: `src/app/api/products/[id]/route.ts`
  - Variants Management API: `src/app/api/variants/route.ts`
  - Category List API: `src/app/api/categories/route.ts`
  - Inventory Check API: `src/app/api/inventory/route.ts`
- **Services & Logic**:
  - Stock & Variant Inventory Logic: `src/lib/inventory.ts`
  - Variant Services: `src/lib/variant/`
  - Seeders & Sample Data: `src/lib/sampleData.ts`, `src/lib/seeders/`

---

### 2. Authentication & User Account Management
Handles user registration, user login, session management via HTTP-only JWT cookies, profile updates, address management, password recovery, and admin authorization.

- **Frontend Pages**:
  - Login Page: `src/app/login/page.tsx`
  - Registration Page: `src/app/register/page.tsx`
  - Account Dashboard & Profile Edit: `src/app/account/page.tsx`
  - Order History: `src/app/account/orders/page.tsx`
  - Account Wishlist: `src/app/account/wishlist/page.tsx`
  - Forgot Password: `src/app/forgot-password/page.tsx`
  - Reset Password: `src/app/reset-password/page.tsx`
- **UI Components**:
  - Secure Password Input: `src/components/PasswordInput.tsx`
  - User Account Layout: `src/components/account/`
- **API Endpoints**:
  - Login Route: `src/app/api/auth/login/route.ts`
  - Register Route: `src/app/api/auth/register/route.ts`
  - Current User (`/me`) Route: `src/app/api/auth/me/route.ts`
  - Logout Route: `src/app/api/auth/logout/route.ts`
  - Forgot Password Route: `src/app/api/auth/forgot-password/route.ts`
  - Reset Password Route: `src/app/api/auth/reset-password/route.ts`
- **State & Context**:
  - Authentication Context Provider: `src/contexts/AuthContext.tsx`
- **Services & Security**:
  - Authentication Helpers: `src/lib/auth.ts`
  - JWT Session Utilities: `src/lib/session.ts`
  - Route Protection Middleware: `src/middleware.ts`

---

### 3. Shopping Cart & Wishlist Systems
Manages active cart state, guest vs. logged-in user cart synchronization, line item variation selection, item removal, cart drawer updates, and saved wishlist items.

- **Frontend Pages**:
  - Shopping Cart Page: `src/app/cart/page.tsx`
  - Account Wishlist Page: `src/app/account/wishlist/page.tsx`
- **UI Components**:
  - Navigation Cart Counter & Dropdown: `src/components/Navbar.tsx`
- **API Endpoints**:
  - Shopping Cart Management API: `src/app/api/cart/route.ts`
  - Wishlist Management API: `src/app/api/wishlist/route.ts`
- **State & Context**:
  - Cart State Context Provider: `src/contexts/CartContext.tsx`

---

### 4. Checkout, Orders & Invoice Generation
Handles order creation, shipping address collection, coupon code applications, tax/shipping cost calculation, order status tracking, and automated PDF invoice generation.

- **Frontend Pages**:
  - Checkout Page: `src/app/checkout/page.tsx`
  - Customer Orders Page: `src/app/account/orders/page.tsx`
- **API Endpoints**:
  - Order Processing API: `src/app/api/orders/route.ts`
  - Specific Order Lookup API: `src/app/api/orders/[id]/route.ts`
  - PDF Invoice Preview & Generation: `src/app/api/preview-invoice/route.ts`
- **Services & Logic**:
  - Order Status Lifecycle Service: `src/lib/orders/OrderStatusService.ts`
  - Value Added Tax (VAT) Helper: `src/lib/vat.ts`
  - PDF Invoice Renderer: `src/lib/email/InvoicePDF.tsx`

---

### 5. Payments Integration
Supports multiple payment options: Cash on Delivery (COD), PayPal Smart Buttons, and Google Pay integration.

- **Frontend Integration**:
  - Payment Selector: `src/app/checkout/page.tsx`
- **API Endpoints**:
  - PayPal Capture & Order Routes: `src/app/api/payments/paypal/route.ts`
- **Services & SDK Integration**:
  - PayPal Integration Client: `src/lib/paypal.ts`
  - Google Pay Helper: `src/lib/googlepay.ts`

---

### 6. Backorders & Waitlist System
Manages out-of-stock product waitlist subscriptions, automated restock email alerts, conversion tracking, priority order queuing, and restock arrival date estimates.

- **Frontend Pages**:
  - Admin Backorders Dashboard: `src/app/admin/backorders/page.tsx`
  - Admin Waitlists Management: `src/app/admin/waitlists/page.tsx`
- **UI Components**:
  - Backorder Alert Badge & Subscription Components: `src/components/backorder/`
- **API Endpoints**:
  - Waitlist Subscription API: `src/app/api/waitlist/route.ts`
  - Backorders API: `src/app/api/backorders/route.ts`
- **Custom Hooks**:
  - Restock Date Estimator Hook: `src/hooks/useRestockDate.ts`
- **Services & Helpers**:
  - Backorder Logic Utilities: `src/lib/backorder/`

---

### 7. Administration & Store Management
Provides role-protected administration pages for store monitoring, product catalog updates, inventory controls, order fulfillment, coupon creation, site settings adjustments, CMS legal text updates, and customer waitlists.

- **Frontend Pages**:
  - Admin Dashboard Overview: `src/app/admin/page.tsx`
  - Admin Product Management: `src/app/admin/products/page.tsx`
  - Admin Order Fulfillment: `src/app/admin/orders/page.tsx`
  - Admin User Accounts: `src/app/admin/users/page.tsx`
  - Analytics & Reports: `src/app/admin/analytics/page.tsx`
  - Coupon Manager: `src/app/admin/coupons/page.tsx`
  - Site Settings & Banners: `src/app/admin/settings/page.tsx`
  - Legal CMS Editor: `src/app/admin/legal/page.tsx`
  - Media Uploads: `src/app/admin/media/page.tsx`
- **UI Components**:
  - Dashboard Sidebar & Header Layout: `src/components/DashboardLayout.tsx`
  - Database Statistics Card: `src/components/admin/DatabaseStats.tsx`
  - Image Upload Drag & Drop Component: `src/components/admin/ImageUpload.tsx`
  - Rich Text Area Editor: `src/components/admin/RichTextarea.tsx`
- **API Endpoints**:
  - Admin Protected API Routes: `src/app/api/admin/`
  - Analytics Summary API: `src/app/api/analytics/route.ts`
  - Image & File Upload API: `src/app/api/upload/route.ts`

---

### 8. Marketing, Coupons & Messaging
Supports percentage and fixed-value discount coupons, newsletter signup captures, contact form message submissions, and product customer reviews.

- **Frontend Pages**:
  - Contact Us Page: `src/app/contact/page.tsx`
- **API Endpoints**:
  - Coupon Validation & Creation API: `src/app/api/coupons/route.ts`
  - Contact Message Submission API: `src/app/api/contact/route.ts`
  - Newsletter Registration API: `src/app/api/newsletter/route.ts`

---

### 9. Transactional Email & Notifications
Handles transactional emails (order placement confirmations, shipping notifications with tracking, waitlist restock alerts, password resets) and email testing tools.

- **API Endpoints**:
  - Notifications Dispatch API: `src/app/api/notifications/route.ts`
  - Test Email Route: `src/app/api/test-email/route.ts`
- **Services & Assets**:
  - Email Transport & Template Engine: `src/lib/email/EmailService.ts`
  - Unsubscribe Security Tokens: `src/lib/unsubscribeToken.ts`
  - Base64 Encoded Logo for HTML Emails: `src/lib/email/logoBase64.ts`

---

### 10. Print-on-Demand & Product Customizer
Interactive tool enabling customers to customize apparel items before ordering.

- **Frontend Pages**:
  - Product Customizer: `src/app/customize/page.tsx`
- **API Endpoints**:
  - Customization Options API: `src/app/api/customize/route.ts`

---

### 11. Localization & Legal Compliance
Manages multi-language translations (German/English), cookie consent banners, and mandatory legal compliance pages.

- **Frontend Pages**:
  - Imprint (*Impressum*): `src/app/imprint/page.tsx`
  - Privacy Policy (*Datenschutz*): `src/app/privacy/page.tsx`
  - Terms & Conditions (*AGB*): `src/app/terms/page.tsx`
  - Shipping Info (*Versand*): `src/app/shipping/page.tsx`
  - Returns Policy (*Rückgabe*): `src/app/returns/page.tsx`
  - FAQ (*Häufig gestellte Fragen*): `src/app/faq/page.tsx`
- **UI Components**:
  - Language Switcher (DE/EN): `src/components/LanguageSwitcher.tsx`
  - GDPR Cookie Banner: `src/components/CookieConsent.tsx`
  - Legal Container Layout: `src/components/LegalLayout.tsx`
- **Translation Dictionary**:
  - Comprehensive Translation Keys (German/English): `src/lib/translations.ts`

---

**Note (per merge plan):** Bilingual (DE/EN) legal pages and i18n system are excluded from the generic merged SaaS product — this was a client-specific requirement for Attireburg, not a generic feature. Retain as a per-client add-on option.
