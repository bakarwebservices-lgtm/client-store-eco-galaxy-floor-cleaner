# Database Schema Documentation — Merged SaaS Template

This document provides a comprehensive breakdown of the database schema for the **AWWeb Merged SaaS Template** e-commerce platform. Managed with [Prisma ORM](https://www.prisma.io/) and PostgreSQL.

> **Living Reference:** This document reflects `prisma/schema.prisma` and must be updated immediately whenever schema modifications occur, per `BUILD_STANDARDS.md` section 1.4.

---

## 1. Entity-Relationship Overview

```
[AdminUser] (Isolated auth)

[Customer] 1 ──── < CustomerAddress
    │      1 ──── < Order > 1 ──── < OrderItem > ──── 1? [ProductVariant]
    │      1 ──── 1? [Cart] 1 ──── < CartItem >  ──── 1? [ProductVariant]
    │      1 ──── < Wishlist > ──── 1 [Product]
    │      1 ──── < Review > ──── 1 [Product]
    │      1 ──── < WaitlistSubscription > 1 ──── < RestockNotification
    │                                      1 ──── 1? [ProductVariant]
    └──────1 ──── < AbandonedCheckout

[Product] 1 ──── < ProductVariant > 1 ──── < ProductImage
    │     1 ──── < ProductImage
    │     1 ──── < CollectionProduct > ──── 1 [Collection]
    │     1 ──── < CategoryProduct > ────── 1 [Category]
    └─────1 ──── < RestockSchedule > ────── 1? [ProductVariant]

[Coupon]             [BlogArticle]         [Page]                [FaqItem]
[Newsletter]         [ContactMessage]      [Setting]             [MediaAsset]
```

---

## 2. Database Enums

### `AdminRole`
| Value | Description |
| :--- | :--- |
| `ADMIN` | Super administrator with complete access to settings, staff, data, and store operations |
| `MANAGER` | Store manager with access to catalog, orders, CMS, and customer management |
| `SUPPORT` | Customer support agent with read/action access limited to orders, messages, and reviews |

### `PaymentStatus`
| Value | Description |
| :--- | :--- |
| `UNPAID` | Payment pending / not yet captured (e.g. COD pending delivery, unpaid invoice) |
| `PAID` | Payment confirmed and captured |
| `REFUNDED` | Payment fully or partially returned to customer |

### `FulfillmentStatus`
| Value | Description |
| :--- | :--- |
| `UNFULFILLED` | Items not yet processed or dispatched |
| `FULFILLED` | Order packaged and dispatched to customer |
| `RETURNED` | Order returned to inventory / RTO (Return to Origin) |

### `DiscountType`
| Value | Description |
| :--- | :--- |
| `PERCENTAGE` | Discount calculated as a percentage deduction off qualifying subtotal |
| `FIXED` | Discount deducted as a fixed currency amount |

### `CollectionType`
| Value | Description |
| :--- | :--- |
| `MANUAL` | Products explicitly assigned to collection by administrator |
| `SMART` | Products dynamically included via defined matching rules (tags, vendor, type) |

### `ProductStatus`
| Value | Description |
| :--- | :--- |
| `ACTIVE` | Visible and purchasable in storefront |
| `DRAFT` | Hidden from storefront; undergoing creation/editing in admin |
| `ARCHIVED` | Deprecated product hidden from customer catalog |

### `BlogStatus`
| Value | Description |
| :--- | :--- |
| `DRAFT` | Unpublished article undergoing drafting in admin |
| `PUBLISHED` | Publicly accessible blog article on storefront |

### `PageStatus`
| Value | Description |
| :--- | :--- |
| `ACTIVE` | Publicly published static CMS page |
| `HIDDEN` | Unpublished / draft CMS page |

---

## 3. Data Models (Tables)

### 1. `AdminUser` (`admin_users`)
Role-based staff authentication table. Kept completely separate from customer records to isolate attack surfaces.
| Field | Type | Attributes | Description |
| :--- | :--- | :--- | :--- |
| `id` | `String` | `@id @default(uuid())` | Primary key |
| `name` | `String` | — | Staff full name |
| `email` | `String` | `@unique` | Login email address |
| `passwordHash` | `String` | `@map("password_hash")` | Hashed password (`bcryptjs`) |
| `role` | `AdminRole` | `@default(SUPPORT)` | Tiered permission level (`ADMIN`, `MANAGER`, `SUPPORT`) |
| `lastLogin` | `DateTime?` | Optional, `@map("last_login")` | Last login timestamp |
| `createdAt` | `DateTime` | `@default(now()) @map("created_at")` | Record creation timestamp |
| `updatedAt` | `DateTime` | `@updatedAt @map("updated_at")` | Record modification timestamp |

---

### 2. `Customer` (`customers`)
Unified customer identity model supporting both guest checkout and full account creation via nullable password.
| Field | Type | Attributes | Description |
| :--- | :--- | :--- | :--- |
| `id` | `String` | `@id @default(uuid())` | Primary key |
| `email` | `String?` | `@unique`, Optional | Customer email (unique when present) |
| `phone` | `String?` | `@unique`, Optional | Customer phone number |
| `firstName` | `String?` | Optional, `@map("first_name")` | First name |
| `lastName` | `String?` | Optional, `@map("last_name")` | Last name |
| `passwordHash` | `String?` | Optional, `@map("password_hash")` | Null for guest checkouts; set on account registration |
| `isActive` | `Boolean` | `@default(true) @map("is_active")` | Account status toggle |
| `lastLogin` | `DateTime?` | Optional, `@map("last_login")` | Last login timestamp |
| `createdAt` | `DateTime` | `@default(now()) @map("created_at")` | Record creation timestamp |
| `updatedAt` | `DateTime` | `@updatedAt @map("updated_at")` | Record modification timestamp |
| `deletedAt` | `DateTime?` | Optional, `@map("deleted_at")` | Soft delete timestamp |

**Relationships:** `addresses` (1-M `CustomerAddress`), `orders` (1-M `Order`), `wishlist` (1-M `Wishlist`), `reviews` (1-M `Review`), `cart` (1-1 `Cart`), `waitlistSubscriptions` (1-M `WaitlistSubscription`), `abandonedCheckouts` (1-M `AbandonedCheckout`).  
**Indexes:** `email`, `phone`, `isActive`.

---

### 3. `CustomerAddress` (`customer_addresses`)
Saved shipping and billing addresses associated with customer accounts. No hardcoded country default.
| Field | Type | Attributes | Description |
| :--- | :--- | :--- | :--- |
| `id` | `String` | `@id @default(uuid())` | Primary key |
| `customerId` | `String` | FK, `@map("customer_id")` | References `Customer.id` (onDelete: Cascade) |
| `label` | `String?` | Optional | Address label (e.g. "Home", "Office") |
| `firstName` | `String` | `@map("first_name")` | Recipient first name |
| `lastName` | `String` | `@map("last_name")` | Recipient last name |
| `phone` | `String?` | Optional | Contact phone for delivery |
| `address` | `String` | — | Street address line |
| `city` | `String` | — | City name |
| `province` | `String?` | Optional | State / Province |
| `postalCode` | `String?` | Optional, `@map("postal_code")` | Postal / ZIP code |
| `country` | `String` | — | Country name (populated from `Setting (store.country)` at app layer) |
| `isDefault` | `Boolean` | `@default(false) @map("is_default")` | Default shipping address flag |
| `createdAt` | `DateTime` | `@default(now()) @map("created_at")` | Record creation timestamp |
| `updatedAt` | `DateTime` | `@updatedAt @map("updated_at")` | Record modification timestamp |

**Relationships:** `customer` (belongs to `Customer`).  
**Indexes:** `customerId`.

---

### 4. `Product` (`products`)
Catalog core product entity with integrated SEO fields and soft-delete capabilities.
| Field | Type | Attributes | Description |
| :--- | :--- | :--- | :--- |
| `id` | `String` | `@id @default(uuid())` | Primary key |
| `name` | `String` | — | Product display title |
| `slug` | `String` | `@unique` | URL slug |
| `description` | `String` | `@db.Text` | Rich text / formatted product description |
| `price` | `Float` | — | Base retail price |
| `comparePrice` | `Float?` | Optional, `@map("compare_price")` | Strike-through original price for discounts |
| `status` | `ProductStatus` | `@default(ACTIVE)` | `ACTIVE`, `DRAFT`, `ARCHIVED` |
| `type` | `String?` | Optional | Product type (e.g. "Ring", "Apparel") |
| `vendor` | `String?` | Optional | Brand or supplier name |
| `tags` | `String[]` | `@default([])` | Search and taxonomy tags |
| `weight` | `Float?` | Optional | Physical weight in kg (for shipping tiers) |
| `featured` | `Boolean` | `@default(false)` | Homepage featured badge flag |
| `hasVariants` | `Boolean` | `@default(false) @map("has_variants")` | Indicates if product has SKU variations |
| `seoTitle` | `String?` | Optional, `@map("seo_title")` | Page SEO title tag |
| `seoDescription`| `String?` | Optional, `@db.Text @map("seo_description")` | Page SEO meta description |
| `createdAt` | `DateTime` | `@default(now()) @map("created_at")` | Record creation timestamp |
| `updatedAt` | `DateTime` | `@updatedAt @map("updated_at")` | Record modification timestamp |
| `deletedAt` | `DateTime?` | Optional, `@map("deleted_at")` | Soft delete timestamp |

**Relationships:** `variants` (1-M `ProductVariant`), `images` (1-M `ProductImage`), `collections` (1-M `CollectionProduct`), `categories` (1-M `CategoryProduct`), `orderItems` (1-M `OrderItem`), `reviews` (1-M `Review`), `cartItems` (1-M `CartItem`), `wishlist` (1-M `Wishlist`), `waitlistSubscriptions` (1-M `WaitlistSubscription`), `restockSchedules` (1-M `RestockSchedule`).  
**Indexes:** `status`, `featured`, `slug`.

---

### 5. `ProductVariant` (`product_variants`)
Granular product variation entity controlling inventory, pricing overrides, sizes, and colors.
| Field | Type | Attributes | Description |
| :--- | :--- | :--- | :--- |
| `id` | `String` | `@id @default(uuid())` | Primary key |
| `productId` | `String` | FK, `@map("product_id")` | References `Product.id` (onDelete: Cascade) |
| `title` | `String` | — | Human-readable label (e.g. "Black / Size L") |
| `sku` | `String` | `@unique` | Stock Keeping Unit |
| `price` | `Float?` | Optional | Overrides base product price if set |
| `comparePrice` | `Float?` | Optional, `@map("compare_price")` | Variant strike-through price |
| `inventoryQty` | `Int` | `@default(0) @map("inventory_qty")` | Available stock count |
| `color` | `String?` | Optional | Color attribute value |
| `size` | `String?` | Optional | Size attribute value |
| `barcode` | `String?` | Optional | Barcode / UPC identifier |
| `isActive` | `Boolean` | `@default(true) @map("is_active")` | Variant active toggle |
| `createdAt` | `DateTime` | `@default(now()) @map("created_at")` | Record creation timestamp |
| `updatedAt` | `DateTime` | `@updatedAt @map("updated_at")` | Record modification timestamp |

**Relationships:** `product` (belongs to `Product`), `images` (1-M `ProductImage`), `orderItems` (1-M `OrderItem`), `cartItems` (1-M `CartItem`), `waitlistSubscriptions` (1-M `WaitlistSubscription`), `restockSchedules` (1-M `RestockSchedule`).  
**Indexes:** `productId`, `sku`, `isActive`.

---

### 6. `ProductImage` (`product_images`)
Gallery image table supporting alt text, positioning, primary flags, and optional variant links.
| Field | Type | Attributes | Description |
| :--- | :--- | :--- | :--- |
| `id` | `String` | `@id @default(uuid())` | Primary key |
| `productId` | `String` | FK, `@map("product_id")` | References `Product.id` (onDelete: Cascade) |
| `variantId` | `String?` | FK, Optional, `@map("variant_id")` | References `ProductVariant.id` (onDelete: SetNull) |
| `url` | `String` | — | Image asset URL |
| `altText` | `String?` | Optional, `@map("alt_text")` | Image alt text (editable in admin, rendered in HTML) |
| `position` | `Int` | `@default(0)` | Gallery sort order |
| `isPrimary` | `Boolean` | `@default(false) @map("is_primary")` | Primary catalog thumbnail indicator |
| `createdAt` | `DateTime` | `@default(now()) @map("created_at")` | Record creation timestamp |
| `updatedAt` | `DateTime` | `@updatedAt @map("updated_at")` | Record modification timestamp |

**Relationships:** `product` (belongs to `Product`), `variant` (belongs to `ProductVariant`).  
**Indexes:** `productId`, `variantId`.

---

### 7. `Collection` (`collections`)
Product grouping entity supporting manual curation and smart automated rule matching.
| Field | Type | Attributes | Description |
| :--- | :--- | :--- | :--- |
| `id` | `String` | `@id @default(uuid())` | Primary key |
| `name` | `String` | — | Collection title |
| `slug` | `String` | `@unique` | URL slug |
| `description` | `String?` | Optional, `@db.Text` | Collection overview description |
| `imageUrl` | `String?` | Optional, `@map("image_url")` | Hero banner image URL |
| `imageAlt` | `String?` | Optional, `@map("image_alt")` | Banner image alt text |
| `type` | `CollectionType` | `@default(MANUAL)` | `MANUAL` or `SMART` |
| `ruleField` | `String?` | Optional, `@map("rule_field")` | Smart rule attribute (e.g. "tags", "vendor") |
| `ruleOperator`| `String?` | Optional, `@map("rule_operator")` | Comparison operator ("equals", "contains") |
| `ruleValue` | `String?` | Optional, `@map("rule_value")` | Match target value |
| `isActive` | `Boolean` | `@default(true) @map("is_active")` | Visibility flag |
| `sortOrder` | `Int` | `@default(0) @map("sort_order")` | Display order index |
| `seoTitle` | `String?` | Optional, `@map("seo_title")` | Collection SEO title tag |
| `seoDescription`| `String?` | Optional, `@db.Text @map("seo_description")` | Collection SEO meta description |
| `createdAt` | `DateTime` | `@default(now()) @map("created_at")` | Record creation timestamp |
| `updatedAt` | `DateTime` | `@updatedAt @map("updated_at")` | Record modification timestamp |

**Relationships:** `products` (1-M `CollectionProduct`).  
**Indexes:** `slug`, `isActive`.

---

### 8. `CollectionProduct` (`collection_products`)
Junction table linking collections and products with positional sorting.
| Field | Type | Attributes | Description |
| :--- | :--- | :--- | :--- |
| `collectionId` | `String` | PK, FK, `@map("collection_id")` | References `Collection.id` (onDelete: Cascade) |
| `productId` | `String` | PK, FK, `@map("product_id")` | References `Product.id` (onDelete: Cascade) |
| `position` | `Int` | `@default(0)` | Sort order position within collection |

---

### 9. `Category` (`categories`)
Top-level hierarchical navigation taxonomy for storefront menu browsing.
| Field | Type | Attributes | Description |
| :--- | :--- | :--- | :--- |
| `id` | `String` | `@id @default(uuid())` | Primary key |
| `name` | `String` | — | Category display name |
| `slug` | `String` | `@unique` | URL slug |
| `description` | `String?` | Optional, `@db.Text` | Description |
| `imageUrl` | `String?` | Optional, `@map("image_url")` | Thumbnail / header image URL |
| `imageAlt` | `String?` | Optional, `@map("image_alt")` | Thumbnail alt text |
| `isActive` | `Boolean` | `@default(true) @map("is_active")` | Active status flag |
| `sortOrder` | `Int` | `@default(0) @map("sort_order")` | Navigation ordering priority |
| `seoTitle` | `String?` | Optional, `@map("seo_title")` | Category SEO title tag |
| `seoDescription`| `String?` | Optional, `@db.Text @map("seo_description")` | Category SEO meta description |
| `createdAt` | `DateTime` | `@default(now()) @map("created_at")` | Record creation timestamp |
| `updatedAt` | `DateTime` | `@updatedAt @map("updated_at")` | Record modification timestamp |

**Relationships:** `products` (1-M `CategoryProduct`).  
**Indexes:** `isActive`, `sortOrder`.

---

### 10. `CategoryProduct` (`category_products`)
Junction table linking categories and products.
| Field | Type | Attributes | Description |
| :--- | :--- | :--- | :--- |
| `categoryId` | `String` | PK, FK, `@map("category_id")` | References `Category.id` (onDelete: Cascade) |
| `productId` | `String` | PK, FK, `@map("product_id")` | References `Product.id` (onDelete: Cascade) |
| `position` | `Int` | `@default(0)` | Sort order position within category |

---

### 11. `Cart` (`carts`)
Persistent cart container supporting both authenticated customers and guest session tokens.
| Field | Type | Attributes | Description |
| :--- | :--- | :--- | :--- |
| `id` | `String` | `@id @default(uuid())` | Primary key |
| `customerId` | `String?` | FK, `@unique`, Optional, `@map("customer_id")` | References `Customer.id` (onDelete: Cascade) |
| `sessionId` | `String?` | `@unique`, Optional, `@map("session_id")` | Guest cart cookie session identifier |
| `createdAt` | `DateTime` | `@default(now()) @map("created_at")` | Record creation timestamp |
| `updatedAt` | `DateTime` | `@updatedAt @map("updated_at")` | Record modification timestamp |

**Relationships:** `customer` (belongs to `Customer`), `items` (1-M `CartItem`).

---

### 12. `CartItem` (`cart_items`)
Line items stored inside active customer or guest shopping carts.
| Field | Type | Attributes | Description |
| :--- | :--- | :--- | :--- |
| `id` | `String` | `@id @default(uuid())` | Primary key |
| `cartId` | `String` | FK, `@map("cart_id")` | References `Cart.id` (onDelete: Cascade) |
| `productId` | `String` | FK, `@map("product_id")` | References `Product.id` (onDelete: Cascade) |
| `variantId` | `String?` | FK, Optional, `@map("variant_id")` | References `ProductVariant.id` (onDelete: SetNull) |
| `quantity` | `Int` | — | Selected purchase quantity |
| `createdAt` | `DateTime` | `@default(now()) @map("created_at")` | Record creation timestamp |
| `updatedAt` | `DateTime` | `@updatedAt @map("updated_at")` | Record modification timestamp |

**Relationships:** `cart` (belongs to `Cart`), `product` (belongs to `Product`), `variant` (belongs to `ProductVariant`).  
**Unique:** `[cartId, productId, variantId]`. **Indexes:** `cartId`.

---

### 13. `Wishlist` (`wishlist`)
Saved customer wishlist items.
| Field | Type | Attributes | Description |
| :--- | :--- | :--- | :--- |
| `id` | `String` | `@id @default(uuid())` | Primary key |
| `customerId` | `String` | FK, `@map("customer_id")` | References `Customer.id` (onDelete: Cascade) |
| `productId` | `String` | FK, `@map("product_id")` | References `Product.id` (onDelete: Cascade) |
| `createdAt` | `DateTime` | `@default(now()) @map("created_at")` | Record creation timestamp |

**Relationships:** `customer` (belongs to `Customer`), `product` (belongs to `Product`).  
**Unique:** `[customerId, productId]`. **Indexes:** `customerId`.

---

### 14. `Order` (`orders`)
Complete order record with dual-status tracking (`paymentStatus` + `fulfillmentStatus`), abstracted payment JSON meta, snapshotted shipping addresses, and guest linkage flags. High-level order state is derived computationally via helper functions, eliminating data sync contradictions.
| Field | Type | Attributes | Description |
| :--- | :--- | :--- | :--- |
| `id` | `String` | `@id @default(uuid())` | Primary key |
| `orderNumber` | `String` | `@unique @map("order_number")` | Human-readable order identifier (e.g. "#1001") |
| `customerId` | `String` | FK, `@map("customer_id")` | References `Customer.id` |
| `paymentStatus` | `PaymentStatus` | `@default(UNPAID) @map("payment_status")` | `UNPAID`, `PAID`, `REFUNDED` |
| `fulfillmentStatus`| `FulfillmentStatus` | `@default(UNFULFILLED) @map("fulfillment_status")` | `UNFULFILLED`, `FULFILLED`, `RETURNED` |
| `cancelledAt` | `DateTime?` | Optional, `@map("cancelled_at")` | Order cancellation timestamp (null if active) |
| `paymentMethod` | `String` | `@default("COD") @map("payment_method")` | Payment gateway name ("COD", "PayPal", "JazzCash") |
| `paymentMeta` | `Json?` | Optional, `@map("payment_meta")` | Abstracted gateway payload (transaction IDs, capture status) |
| `subtotal` | `Float` | — | Pre-discount, pre-tax product total |
| `discountAmount`| `Float` | `@default(0) @map("discount_amount")` | Value deducted by coupon or promotion |
| `shippingAmount`| `Float` | `@default(0) @map("shipping_amount")` | Shipping charges applied |
| `taxAmount` | `Float` | `@default(0) @map("tax_amount")` | Tax / VAT applied |
| `totalPrice` | `Float` | `@map("total_price")` | Final grand total payable |
| `currency` | `String` | — | Currency code (populated from `Setting (store.currency)` at app layer) |
| `couponCode` | `String?` | Optional, `@map("coupon_code")` | Applied coupon code string |
| `shippingAddress`| `Json` | `@map("shipping_address")` | Immutable JSON address snapshot at checkout |
| `guestOrderPossiblyLinked` | `Boolean` | `@default(false) @map("guest_order_possibly_linked")` | Flag indicating guest email matches registered account |
| `orderType` | `String` | `@default("standard") @map("order_type")` | "standard", "backorder", "preorder" |
| `expectedFulfillmentDate` | `DateTime?` | Optional, `@map("expected_fulfillment_date")` | Estimated fulfillment date for backorders |
| `notes` | `String?` | Optional, `@db.Text` | Internal staff or customer delivery notes |
| `createdAt` | `DateTime` | `@default(now()) @map("created_at")` | Order placement timestamp |
| `updatedAt` | `DateTime` | `@updatedAt @map("updated_at")` | Order modification timestamp |
| `deletedAt` | `DateTime?` | Optional, `@map("deleted_at")` | Soft delete timestamp |

**Relationships:** `customer` (belongs to `Customer`), `items` (1-M `OrderItem`).  
**Indexes:** `customerId`, `paymentStatus`, `fulfillmentStatus`, `orderNumber`, `createdAt`.

---

### 15. `OrderItem` (`order_items`)
Line items of an order storing immutable snapshots of product name, variant title, and SKU at purchase time.
| Field | Type | Attributes | Description |
| :--- | :--- | :--- | :--- |
| `id` | `String` | `@id @default(uuid())` | Primary key |
| `orderId` | `String` | FK, `@map("order_id")` | References `Order.id` (onDelete: Cascade) |
| `productId` | `String` | FK, `@map("product_id")` | References `Product.id` (onDelete: Restrict) |
| `variantId` | `String?` | FK, Optional, `@map("variant_id")` | References `ProductVariant.id` (onDelete: SetNull) |
| `productTitle` | `String` | `@map("product_title")` | **Snapshot:** Product title at purchase time |
| `variantTitle` | `String?` | Optional, `@map("variant_title")` | **Snapshot:** Variant title at purchase time |
| `sku` | `String` | — | **Snapshot:** SKU at purchase time |
| `quantity` | `Int` | — | Quantity purchased |
| `unitPrice` | `Float` | `@map("unit_price")` | Price per unit at purchase time |
| `totalPrice` | `Float` | `@map("total_price")` | `quantity * unitPrice` |
| `createdAt` | `DateTime` | `@default(now()) @map("created_at")` | Record creation timestamp |

**Relationships:** `order` (belongs to `Order`), `product` (belongs to `Product`), `variant` (belongs to `ProductVariant`).  
**Indexes:** `orderId`, `productId`.

---

### 16. `AbandonedCheckout` (`abandoned_checkouts`)
Captures partial customer data and cart contents prior to checkout abandonment.
| Field | Type | Attributes | Description |
| :--- | :--- | :--- | :--- |
| `id` | `String` | `@id @default(uuid())` | Primary key |
| `sessionId` | `String` | `@unique @map("session_id")` | Unique browser session ID |
| `customerId` | `String?` | FK, Optional, `@map("customer_id")` | References `Customer.id` (onDelete: SetNull) |
| `name` | `String?` | Optional | Captured name |
| `phone` | `String?` | Optional | Captured phone |
| `email` | `String?` | Optional | Captured email address |
| `address` | `String?` | Optional | Captured address line |
| `city` | `String?` | Optional | Captured city |
| `province` | `String?` | Optional | Captured province |
| `cart` | `Json` | — | JSON snapshot of cart items |
| `subtotal` | `Float` | `@default(0)` | Subtotal at abandonment |
| `discount` | `Float` | `@default(0)` | Discount at abandonment |
| `total` | `Float` | `@default(0)` | Total price at abandonment |
| `recoveryEmailSentAt` | `DateTime?` | Optional, `@map("recovery_email_sent_at")` | Recovery email dispatch timestamp |
| `recoveredAt` | `DateTime?` | Optional, `@map("recovered_at")` | Timestamp when converted to an order |
| `createdAt` | `DateTime` | `@default(now()) @map("created_at")` | Record creation timestamp |
| `updatedAt` | `DateTime` | `@updatedAt @map("updated_at")` | Record modification timestamp |

**Relationships:** `customer` (belongs to `Customer`).  
**Indexes:** `customerId`, `createdAt`.

---

### 17. `Coupon` (`coupons`)
Promotional discount codes supporting percentage and fixed value reductions with usage constraints.
| Field | Type | Attributes | Description |
| :--- | :--- | :--- | :--- |
| `id` | `String` | `@id @default(uuid())` | Primary key |
| `code` | `String` | `@unique` | Promotional code string (e.g. "SUMMER20") |
| `description` | `String?` | Optional | Internal campaign notes |
| `discountType` | `DiscountType` | `@map("discount_type")` | `PERCENTAGE` or `FIXED` |
| `discountValue` | `Float` | `@map("discount_value")` | Value (% or fixed amount) |
| `minOrderAmount`| `Float?` | Optional, `@map("min_order_amount")` | Minimum required subtotal to apply |
| `maxUses` | `Int?` | Optional, `@map("max_uses")` | Total usage limit (null = unlimited) |
| `usedCount` | `Int` | `@default(0) @map("used_count")` | Cumulative usage count |
| `isActive` | `Boolean` | `@default(true) @map("is_active")` | Active coupon toggle |
| `startsAt` | `DateTime?` | Optional, `@map("starts_at")` | Activation start timestamp |
| `expiresAt` | `DateTime?` | Optional, `@map("expires_at")` | Expiration timestamp |
| `createdAt` | `DateTime` | `@default(now()) @map("created_at")` | Record creation timestamp |
| `updatedAt` | `DateTime` | `@updatedAt @map("updated_at")` | Record modification timestamp |

**Indexes:** `code`, `isActive`.

---

### 18. `Review` (`reviews`)
Customer ratings and reviews with media uploads, verified buyer badges, and admin moderation gating.
| Field | Type | Attributes | Description |
| :--- | :--- | :--- | :--- |
| `id` | `String` | `@id @default(uuid())` | Primary key |
| `productId` | `String` | FK, `@map("product_id")` | References `Product.id` (onDelete: Cascade) |
| `customerId` | `String?` | FK, Optional, `@map("customer_id")` | References `Customer.id` (onDelete: SetNull) |
| `reviewerName` | `String` | `@map("reviewer_name")` | Display name of reviewer |
| `rating` | `Int` | — | Star rating (1 to 5) |
| `title` | `String?` | Optional | Review headline summary |
| `body` | `String?` | Optional, `@db.Text` | Full review feedback text |
| `images` | `String[]` | `@default([])` | Array of customer-uploaded image URLs |
| `isVerified` | `Boolean` | `@default(false) @map("is_verified")` | Verified purchaser badge flag |
| `isApproved` | `Boolean` | `@default(false) @map("is_approved")` | Moderation approval toggle (must be true to display) |
| `createdAt` | `DateTime` | `@default(now()) @map("created_at")` | Record creation timestamp |
| `updatedAt` | `DateTime` | `@updatedAt @map("updated_at")` | Record modification timestamp |

**Relationships:** `product` (belongs to `Product`), `customer` (belongs to `Customer`).  
**Indexes:** `productId`, `isApproved`, `rating`.

---

### 19. `WaitlistSubscription` (`waitlist_subscriptions`)
Out-of-stock product / variant waitlist notification subscriptions.
| Field | Type | Attributes | Description |
| :--- | :--- | :--- | :--- |
| `id` | `String` | `@id @default(uuid())` | Primary key |
| `email` | `String` | — | Subscriber email address |
| `productId` | `String` | FK, `@map("product_id")` | References `Product.id` (onDelete: Cascade) |
| `variantId` | `String?` | FK, Optional, `@map("variant_id")` | References `ProductVariant.id` (onDelete: Cascade) |
| `customerId` | `String?` | FK, Optional, `@map("customer_id")` | References `Customer.id` (onDelete: SetNull) |
| `isActive` | `Boolean` | `@default(true) @map("is_active")` | Subscription active flag |
| `createdAt` | `DateTime` | `@default(now()) @map("created_at")` | Subscription timestamp |
| `updatedAt` | `DateTime` | `@updatedAt @map("updated_at")` | Record modification timestamp |

**Relationships:** `product` (belongs to `Product`), `variant` (belongs to `ProductVariant`), `customer` (belongs to `Customer`), `notifications` (1-M `RestockNotification`).  
**Unique:** `[email, productId, variantId]`. **Indexes:** `productId`, `variantId`, `customerId`, `isActive`.

---

### 20. `RestockNotification` (`restock_notifications`)
Logs automated restock alerts and tracks conversion/engagement metrics.
| Field | Type | Attributes | Description |
| :--- | :--- | :--- | :--- |
| `id` | `String` | `@id @default(uuid())` | Primary key |
| `waitlistSubscriptionId` | `String` | FK, `@map("waitlist_subscription_id")` | References `WaitlistSubscription.id` (onDelete: Cascade) |
| `sentAt` | `DateTime` | `@map("sent_at")` | Email dispatch timestamp |
| `emailOpened` | `Boolean` | `@default(false) @map("email_opened")` | Email opened tracking flag |
| `linkClicked` | `Boolean` | `@default(false) @map("link_clicked")` | Link clicked tracking flag |
| `purchaseCompleted` | `Boolean` | `@default(false) @map("purchase_completed")` | Completed order conversion flag |
| `createdAt` | `DateTime` | `@default(now()) @map("created_at")` | Record creation timestamp |

**Relationships:** `subscription` (belongs to `WaitlistSubscription`).  
**Indexes:** `waitlistSubscriptionId`, `sentAt`.

---

### 21. `RestockSchedule` (`restock_schedules`)
Expected restock dates for inventory planning and storefront ETA displays.
| Field | Type | Attributes | Description |
| :--- | :--- | :--- | :--- |
| `id` | `String` | `@id @default(uuid())` | Primary key |
| `productId` | `String` | FK, `@map("product_id")` | References `Product.id` (onDelete: Cascade) |
| `variantId` | `String?` | FK, Optional, `@map("variant_id")` | References `ProductVariant.id` (onDelete: Cascade) |
| `expectedDate` | `DateTime` | `@map("expected_date")` | Expected arrival / replenishment date |
| `actualDate` | `DateTime?` | Optional, `@map("actual_date")` | Actual restocked date |
| `notes` | `String?` | Optional, `@db.Text` | Internal supplier notes |
| `createdAt` | `DateTime` | `@default(now()) @map("created_at")` | Record creation timestamp |
| `updatedAt` | `DateTime` | `@updatedAt @map("updated_at")` | Record modification timestamp |

**Relationships:** `product` (belongs to `Product`), `variant` (belongs to `ProductVariant`).  
**Unique:** `[productId, variantId]`. **Indexes:** `productId`, `expectedDate`.

---

### 22. `BlogArticle` (`blog_articles`)
Blog articles with publishing workflow, rich HTML content, and SEO metadata.
| Field | Type | Attributes | Description |
| :--- | :--- | :--- | :--- |
| `id` | `String` | `@id @default(uuid())` | Primary key |
| `title` | `String` | — | Article headline |
| `slug` | `String` | `@unique` | URL slug |
| `bodyHtml` | `String` | `@db.Text @map("body_html")` | Article body HTML |
| `excerpt` | `String?` | Optional, `@db.Text` | Article summary excerpt |
| `author` | `String?` | Optional | Author display name |
| `featuredImageUrl`| `String?` | Optional, `@map("featured_image_url")`| Main featured image URL |
| `featuredImageAlt`| `String?` | Optional, `@map("featured_image_alt")`| Featured image alt text |
| `status` | `BlogStatus` | `@default(DRAFT)` | `DRAFT` or `PUBLISHED` |
| `publishedAt` | `DateTime?` | Optional, `@map("published_at")` | Publication timestamp |
| `tags` | `String[]` | `@default([])` | Topic tags |
| `seoTitle` | `String?` | Optional, `@map("seo_title")` | SEO title tag |
| `seoDescription`| `String?` | Optional, `@db.Text @map("seo_description")` | SEO meta description |
| `createdAt` | `DateTime` | `@default(now()) @map("created_at")` | Record creation timestamp |
| `updatedAt` | `DateTime` | `@updatedAt @map("updated_at")` | Record modification timestamp |

**Indexes:** `status`, `publishedAt`, `slug`.

---

### 23. `Page` (`pages`)
CMS custom pages (e.g. About, Shipping Policy, Terms, Privacy Policy).
| Field | Type | Attributes | Description |
| :--- | :--- | :--- | :--- |
| `id` | `String` | `@id @default(uuid())` | Primary key |
| `title` | `String` | — | Page title |
| `slug` | `String` | `@unique` | URL slug |
| `bodyHtml` | `String` | `@db.Text @map("body_html")` | Page HTML content |
| `status` | `PageStatus` | `@default(ACTIVE)` | `ACTIVE` or `HIDDEN` |
| `seoTitle` | `String?` | Optional, `@map("seo_title")` | SEO title tag |
| `seoDescription`| `String?` | Optional, `@db.Text @map("seo_description")` | SEO meta description |
| `createdAt` | `DateTime` | `@default(now()) @map("created_at")` | Record creation timestamp |
| `updatedAt` | `DateTime` | `@updatedAt @map("updated_at")` | Record modification timestamp |

**Indexes:** `status`, `slug`.

---

### 24. `FaqItem` (`faq_items`)
Admin-managed FAQ questions and answers for accordion display.
| Field | Type | Attributes | Description |
| :--- | :--- | :--- | :--- |
| `id` | `String` | `@id @default(uuid())` | Primary key |
| `question` | `String` | — | FAQ question text |
| `answer` | `String` | `@db.Text` | FAQ answer text (HTML / formatted) |
| `category` | `String?` | Optional | Grouping label (e.g. "Shipping", "Returns") |
| `sortOrder` | `Int` | `@default(0) @map("sort_order")` | Display ordering priority |
| `isActive` | `Boolean` | `@default(true) @map("is_active")` | Visibility flag |
| `createdAt` | `DateTime` | `@default(now()) @map("created_at")` | Record creation timestamp |
| `updatedAt` | `DateTime` | `@updatedAt @map("updated_at")` | Record modification timestamp |

**Indexes:** `isActive`, `sortOrder`.

---

### 25. `Newsletter` (`newsletter`)
Newsletter subscription email capture records.
| Field | Type | Attributes | Description |
| :--- | :--- | :--- | :--- |
| `id` | `String` | `@id @default(uuid())` | Primary key |
| `email` | `String` | `@unique` | Subscriber email address |
| `isActive` | `Boolean` | `@default(true) @map("is_active")` | Active subscription flag |
| `createdAt` | `DateTime` | `@default(now()) @map("created_at")` | Subscription timestamp |

**Indexes:** `isActive`.

---

### 26. `ContactMessage` (`contact_messages`)
Submissions received via storefront contact forms.
| Field | Type | Attributes | Description |
| :--- | :--- | :--- | :--- |
| `id` | `String` | `@id @default(uuid())` | Primary key |
| `name` | `String` | — | Sender name |
| `email` | `String` | — | Sender email address |
| `phone` | `String?` | Optional | Sender phone number |
| `subject` | `String?` | Optional | Inbound subject |
| `message` | `String` | `@db.Text` | Inbound message body |
| `isRead` | `Boolean` | `@default(false) @map("is_read")` | Staff read status flag |
| `createdAt` | `DateTime` | `@default(now()) @map("created_at")` | Submission timestamp |

**Indexes:** `isRead`, `createdAt`.

---

### 27. `Setting` (`settings`)
Flexible key-value store for all client-specific runtime configuration. Eliminates schema migrations for new settings.
| Field | Type | Attributes | Description |
| :--- | :--- | :--- | :--- |
| `id` | `String` | `@id @default(uuid())` | Primary key |
| `key` | `String` | `@unique` | Unique dot-notated config key (e.g. `store.name`) |
| `value` | `Json` | — | Stored JSON configuration payload |
| `createdAt` | `DateTime` | `@default(now()) @map("created_at")` | Record creation timestamp |
| `updatedAt` | `DateTime` | `@updatedAt @map("updated_at")` | Record modification timestamp |

**Standard Reserved Keys:**
- `store.name`, `store.tagline`, `store.logo_url`, `store.country`, `store.currency`
- `store.contact.email`, `store.contact.phone`, `store.contact.address`
- `theme.primary_color`, `theme.accent_color`, `theme.font_family`
- `shipping.free_threshold`, `shipping.standard_cost`, `tax.rate`
- `tracking.meta_pixel_id`, `tracking.ga4_measurement_id`
- `social.instagram`, `social.facebook`, `social.tiktok`

---

### 28. `MediaAsset` (`media_assets`)
Centralized library of uploaded media assets with required admin alt text support.
| Field | Type | Attributes | Description |
| :--- | :--- | :--- | :--- |
| `id` | `String` | `@id @default(uuid())` | Primary key |
| `url` | `String` | — | Public asset URL |
| `altText` | `String?` | Optional, `@map("alt_text")` | Mandatory editable alt text for SEO / accessibility |
| `filename` | `String` | — | Original uploaded file name |
| `mimeType` | `String` | `@map("mime_type")` | File MIME type (e.g. "image/webp") |
| `sizeBytes` | `Int` | `@map("size_bytes")` | File size in bytes |
| `uploadedById` | `String?` | Optional, `@map("uploaded_by_id")` | Staff uploader identifier |
| `createdAt` | `DateTime` | `@default(now()) @map("created_at")` | Upload timestamp |
| `updatedAt` | `DateTime` | `@updatedAt @map("updated_at")` | Record modification timestamp |

**Indexes:** `mimeType`.

---

## 4. Summary of Decisions & Exclusions

1. **UUID Standardization:** Every model uses `@default(uuid())`.
2. **Staff/Customer Isolation:** `AdminUser` operates independently from `Customer`.
3. **Guest / Account Union:** `Customer.passwordHash` is nullable to unite guest orders and user accounts seamlessly.
4. **Dual Order Statuses:** `paymentStatus` and `fulfillmentStatus` are tracked independently. High-level order state is derived computationally via helper functions, eliminating stored state synchronization risks.
5. **No Hardcoded Regional Defaults:** `CustomerAddress.country` and `Order.currency` have no database-level defaults and are dynamically populated from `Setting (store.country, store.currency)` at the application layer.
6. **Snapshot Integrity:** `OrderItem` immutably captures product titles, variant labels, and SKUs at purchase time.
7. **Key-Value Settings:** All client customization is driven by `Setting` without schema changes.
8. **Explicit Exclusions:** Accounting (`AccountingExpense`, `AdSpend`, `OwnerTransaction`, `PostexSettlement`, `FulfillmentCost`, `SkuCostHistory`), Courier (`Shipment`, `TrackingEvent`), Server Pixel Log (`AnalyticsEvent`), and Bilingual CMS (`LegalContent`) are intentionally excluded from the base template.
