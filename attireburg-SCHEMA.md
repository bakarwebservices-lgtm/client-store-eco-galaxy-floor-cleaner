# Database Schema Documentation

This document provides a comprehensive overview of the database structure for **Attireburg Store**. The database is managed via [Prisma ORM](https://www.prisma.io/) with a PostgreSQL backend (hosted on Supabase).

---

## Entity-Relationship Overview

The database model is structured around core e-commerce entities:
- **Products & Variants**: Catalog items, size/color variations, stock, and pricing overrides.
- **Users & Authentication**: User accounts, contact details, address records, and role flags (`isAdmin`).
- **Orders & Financial Transactions**: Order lifecycle, shipping addresses, discounts, and line items.
- **Cart & Wishlist**: Persistent shopping cart state and saved wishlist items.
- **Backorder & Restock System**: Waitlist subscriptions, automated notification metrics, and estimated restock schedules.
- **Store Operations & CMS**: Categories, promotional coupons, site settings, legal content, newsletter subscriptions, and contact messages.

---

## Database Enums

### `OrderStatus`
| Value | Description |
| :--- | :--- |
| `PENDING` | Order created; awaiting payment confirmation or processing |
| `PROCESSING` | Payment confirmed; order being prepared for dispatch |
| `SHIPPED` | Order dispatched with carrier tracking |
| `DELIVERED` | Order successfully delivered to customer |
| `CANCELLED` | Order cancelled by user or admin |

---

## Data Models (Tables)

### 1. `Product`
| Field | Type | Attributes | Description |
| :--- | :--- | :--- | :--- |
| `id` | `String` | `@id`, `@default(cuid())` | Unique product identifier |
| `name` | `String` | — | Product name (German/Default) |
| `nameEn` | `String` | — | Product name in English |
| `description` | `String` | `@db.Text` | Detailed product description (German) |
| `descriptionEn` | `String` | `@db.Text` | Detailed product description (English) |
| `price` | `Float` | — | Base price in Euros (€) |
| `currency` | `String` | `@default("EUR")` | Price currency code |
| `images` | `String[]` | — | Array of image URLs |
| `category` | `String` | — | Category identifier/slug |
| `sizes` | `String[]` | — | Available simple size options |
| `colors` | `String[]` | — | Available simple color options |
| `stock` | `Int` | `@default(0)` | Stock count for non-variant product |
| `featured` | `Boolean` | `@default(false)` | Homepage featured display flag |
| `onSale` | `Boolean` | `@default(false)` | Sale flag |
| `salePrice` | `Float?` | Optional | Discounted sale price |
| `sku` | `String?` | `@unique`, Optional | Stock Keeping Unit |
| `weight` | `Float?` | Optional | Product weight in kg |
| `tags` | `String[]` | — | Search and filter tags |
| `metaTitle` | `String?` | Optional | SEO title tag |
| `metaDescription` | `String?` | Optional | SEO meta description |
| `isActive` | `Boolean` | `@default(true)` | Product visibility toggle |
| `hasVariants` | `Boolean` | `@default(false)` | Flag indicating if product uses `ProductVariant` records |
| `attributes` | `Json?` | Optional | JSON configuration of product attributes |
| `createdAt` | `DateTime` | `@default(now())` | Record creation timestamp |
| `updatedAt` | `DateTime` | `@updatedAt` | Last record modification timestamp |

Relationships: `variants` (1-M ProductVariant, cascade), `orderItems` (1-M OrderItem, restrict), `reviews` (1-M Review, cascade), `cartItems` (1-M CartItem), `wishlist` (1-M Wishlist, cascade), `waitlistSubscriptions` (1-M, cascade), `restockSchedules` (1-M, cascade).
Indexes: category, featured, isActive, onSale.

---

### 2. `ProductVariant`
| Field | Type | Attributes | Description |
| :--- | :--- | :--- | :--- |
| `id` | `String` | `@id`, `@default(cuid())` | Unique variant identifier |
| `productId` | `String` | FK | References `Product.id` |
| `sku` | `String` | `@unique` | Variant SKU |
| `price` | `Float?` | Optional | Price override |
| `salePrice` | `Float?` | Optional | Sale price override |
| `stock` | `Int` | `@default(0)` | Variant-specific stock level |
| `images` | `String[]` | — | Variant-specific image URLs |
| `attributes` | `Json` | — | Key-value pairs (e.g. `{"color":"red","size":"L"}`) |
| `isActive` | `Boolean` | `@default(true)` | Active status flag |
| `createdAt` | `DateTime` | `@default(now())` | — |
| `updatedAt` | `DateTime` | `@updatedAt` | — |

Relationships: `product` (belongs to, cascade), `waitlistSubscriptions` (1-M, cascade), `restockSchedules` (1-M, cascade).
Indexes: productId, sku, isActive.

---

### 3. `User`
| Field | Type | Attributes | Description |
| :--- | :--- | :--- | :--- |
| `id` | `String` | `@id`, `@default(cuid())` | Unique user identifier |
| `email` | `String` | `@unique` | Login email |
| `name` | `String` | — | Full display name |
| `firstName` | `String?` | Optional | — |
| `lastName` | `String?` | Optional | — |
| `password` | `String` | — | Hashed password |
| `phone` | `String?` | Optional | — |
| `address` | `String?` | Optional | — |
| `city` | `String?` | Optional | — |
| `postalCode` | `String?` | Optional | — |
| `country` | `String` | `@default("Germany")` | — |
| `isAdmin` | `Boolean` | `@default(false)` | Administrator privileges flag |
| `isActive` | `Boolean` | `@default(true)` | — |
| `lastLogin` | `DateTime?` | Optional | — |
| `createdAt` | `DateTime` | `@default(now())` | — |
| `updatedAt` | `DateTime` | `@updatedAt` | — |

Relationships: `orders`, `wishlist`, `reviews`, `cart` (1-1), `waitlistSubscriptions` — all 1-M with User.

---

### 4. `Order`
| Field | Type | Attributes | Description |
| :--- | :--- | :--- | :--- |
| `id` | `String` | `@id`, `@default(cuid())` | — |
| `userId` | `String` | FK | References `User.id` |
| `status` | `OrderStatus` | `@default(PENDING)` | — |
| `totalAmount` | `Float` | — | Grand total (EUR) |
| `currency` | `String` | `@default("EUR")` | — |
| `paymentMethod` | `String` | `@default("cod")` | `"cod"`, `"paypal"`, `"googlepay"` |
| `paypalOrderId` | `String?` | Optional | — |
| `paypalPayerId` | `String?` | Optional | — |
| `shippingAddress` | `String` | — | — |
| `shippingCity` | `String` | — | — |
| `shippingPostal` | `String` | — | — |
| `couponCode` | `String?` | Optional | — |
| `discountAmount` | `Float` | `@default(0)` | — |
| `orderType` | `String` | `@default("standard")` | `"standard"`, `"backorder"`, `"preorder"` |
| `expectedFulfillmentDate` | `DateTime?` | Optional | — |
| `backorderPriority` | `Int?` | Optional | — |
| `createdAt` | `DateTime` | `@default(now())` | — |
| `updatedAt` | `DateTime` | `@updatedAt` | — |

Relationships: `user` (belongs to), `items` (1-M OrderItem, cascade).
Indexes: userId, status, orderType, expectedFulfillmentDate.

---

### 5. `OrderItem`
| Field | Type | Attributes | Description |
| :--- | :--- | :--- | :--- |
| `id` | `String` | `@id`, `@default(cuid())` | — |
| `orderId` | `String` | FK | — |
| `productId` | `String` | FK | — |
| `variantId` | `String?` | FK, Optional | — |
| `quantity` | `Int` | — | — |
| `size` | `String` | — | — |
| `color` | `String?` | Optional | — |
| `price` | `Float` | — | Purchased price per unit |

Relationships: `order` (belongs to, cascade), `product` (references, restrict).
Indexes: orderId, productId, variantId.

---

### 6. `Cart`
| Field | Type | Attributes | Description |
| :--- | :--- | :--- | :--- |
| `id` | `String` | `@id`, `@default(cuid())` | — |
| `userId` | `String` | FK, `@unique` | 1-1 with User |
| `createdAt` | `DateTime` | `@default(now())` | — |
| `updatedAt` | `DateTime` | `@updatedAt` | — |

Relationships: `user` (belongs to, cascade), `items` (1-M CartItem, cascade).

---

### 7. `CartItem`
| Field | Type | Attributes | Description |
| :--- | :--- | :--- | :--- |
| `id` | `String` | `@id`, `@default(cuid())` | — |
| `cartId` | `String` | FK | — |
| `productId` | `String` | FK | — |
| `variantId` | `String?` | FK, Optional | — |
| `quantity` | `Int` | — | — |
| `size` | `String` | — | — |
| `color` | `String?` | Optional | — |
| `createdAt` | `DateTime` | `@default(now())` | — |

Unique: `[cartId, productId, variantId, size, color]`. Indexes: cartId, variantId.

---

### 8. `Wishlist`
| Field | Type | Attributes | Description |
| :--- | :--- | :--- | :--- |
| `id` | `String` | `@id`, `@default(cuid())` | — |
| `userId` | `String` | FK | — |
| `productId` | `String` | FK | — |
| `createdAt` | `DateTime` | `@default(now())` | — |

Unique: `[userId, productId]`. Index: userId.

---

### 9. `Review`
| Field | Type | Attributes | Description |
| :--- | :--- | :--- | :--- |
| `id` | `String` | `@id`, `@default(cuid())` | — |
| `userId` | `String` | FK | — |
| `productId` | `String` | FK | — |
| `rating` | `Int` | — | 1–5 |
| `title` | `String?` | Optional | — |
| `comment` | `String?` | `@db.Text`, Optional | — |
| `isVerified` | `Boolean` | `@default(false)` | Verified purchase badge |
| `createdAt` | `DateTime` | `@default(now())` | — |
| `updatedAt` | `DateTime` | `@updatedAt` | — |

Unique: `[userId, productId]`. Indexes: productId, rating.

---

### 10. `Category`
| Field | Type | Attributes | Description |
| :--- | :--- | :--- | :--- |
| `id` | `String` | `@id`, `@default(cuid())` | — |
| `name` | `String` | — | German name |
| `nameEn` | `String` | — | English name |
| `slug` | `String` | `@unique` | — |
| `description` | `String?` | Optional | — |
| `image` | `String?` | Optional | — |
| `isActive` | `Boolean` | `@default(true)` | — |
| `sortOrder` | `Int` | `@default(0)` | — |
| `createdAt` | `DateTime` | `@default(now())` | — |
| `updatedAt` | `DateTime` | `@updatedAt` | — |

Indexes: isActive, sortOrder.

---

### 11. `LegalContent` *(client-specific — excluded from generic merge)*
`id` (`"imprint"`/`"privacy"`/`"terms"`), `contentDe`, `contentEn`, `updatedAt`.

---

### 12. `SiteSettings`
Singleton settings row (`id` default `"default"`) covering store name/description (DE/EN), contact info, hero text (DE/EN), logo URL, `freeShippingThreshold`, `standardShippingCost`, `taxRate`, notification toggles, announcement text (DE/EN).

---

### 13. `Newsletter`
`id`, `email` (`@unique`), `isActive`, `createdAt`.

---

### 14. `Coupon`
`id`, `code` (`@unique`), `description`, `discountType` (`percentage`/`fixed`), `discountValue`, `minOrderAmount`, `maxUses`, `usedCount`, `isActive`, `expiresAt`, `createdAt`, `updatedAt`. Indexes: code, isActive.

---

### 15. `ContactMessage`
`id`, `name`, `email`, `subject`, `message` (`@db.Text`), `isRead`, `createdAt`. Indexes: isRead, createdAt.

---

### 16. `WaitlistSubscription`
`id`, `email`, `productId` (FK), `variantId` (FK, optional), `userId` (FK, optional), `isActive`, `createdAt`, `updatedAt`. Relationships: product/variant/user (cascade), `notifications` (1-M RestockNotification). Unique: `[email, productId, variantId]`. Indexes: productId, variantId, userId, isActive.

---

### 17. `RestockNotification`
`id`, `waitlistSubscriptionId` (FK, cascade), `sentAt`, `emailOpened`, `linkClicked`, `purchaseCompleted`. Indexes: waitlistSubscriptionId, sentAt.

---

### 18. `RestockSchedule`
`id`, `productId` (FK, cascade), `variantId` (FK, optional, cascade), `expectedDate`, `actualDate`, `notes`, `createdAt`, `updatedAt`. Unique: `[productId, variantId]`. Indexes: productId, variantId, expectedDate.
