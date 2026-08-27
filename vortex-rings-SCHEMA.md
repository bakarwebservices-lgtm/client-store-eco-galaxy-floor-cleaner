# Database Schema Documentation

This document provides a comprehensive breakdown of the database schema for the Vortex Rings e-commerce platform. PostgreSQL with Prisma ORM.

---

## Entity Relationship Diagram (Overview)

```
[Customer] 1 ──── < Order > 1 ──── 1 [Shipment] 1 ──── < TrackingEvent
                      │              │
                      ├── < OrderItem > ──> ProductVariant ──> SkuCostHistory
                      │              │
                      └── < FulfillmentCost

[Product] 1 ──── < ProductVariant
    │     1 ──── < ProductImage
    │     1 ──── < Review
    └───── < CollectionProduct > ──── 1 [Collection]

[AccountingExpense]     [AdSpend]     [OwnerTransaction]     [PostexSettlement]
[Discount]              [Page]        [BlogArticle]          [AbandonedCheckout]
[AnalyticsEvent]        [AdminUser]   [Setting]
```

---

## Database Models & Tables

### 1. `Product`
| Field | Type | Attributes | Description |
| :--- | :--- | :--- | :--- |
| `id` | `String` | `@id @default(uuid())` | — |
| `name` | `String` | | — |
| `slug` | `String` | `@unique` | — |
| `description` | `String` | | HTML/formatted |
| `price` | `Float` | | — |
| `comparePrice` | `Float?` | `@map("compare_price")` | Strike-through price |
| `status` | `String` | `@default("Active")` | `Active`/`Draft`/`Archived` |
| `type` | `String` | | e.g. Ring, Hoodie |
| `vendor` | `String` | `@default("Vortex")` | — |
| `tags` | `String[]` | `@default([])` | — |
| `seoTitle` | `String?` | `@map("seo_title")` | — |
| `seoDescription` | `String?` | `@map("seo_description")` | — |
| `createdAt` | `DateTime` | `@default(now())` | — |
| `updatedAt` | `DateTime` | `@updatedAt` | — |
| `deletedAt` | `DateTime?` | | Soft delete |

Relationships: `collections` (1-M CollectionProduct), `images` (1-M ProductImage), `variants` (1-M ProductVariant), `reviews` (1-M Review).

---

### 2. `ProductVariant`
| Field | Type | Attributes | Description |
| :--- | :--- | :--- | :--- |
| `id` | `String` | `@id @default(uuid())` | — |
| `productId` | `String` | FK | — |
| `title` | `String` | | e.g. `Black / Size 8` |
| `sku` | `String` | `@unique` | — |
| `price` | `Float?` | | Override |
| `inventoryQty` | `Int` | `@default(0)` | — |
| `unitCost` | `Float?` | | COGS per unit |
| `color` | `String` | | — |
| `size` | `String` | | — |
| `barcode` | `String?` | | — |
| `createdAt`/`updatedAt` | `DateTime` | | — |

Relationships: `product` (belongs to, cascade), `orderItems`, `images`, `costHistory` (all 1-M).

---

### 3. `ProductImage`
| Field | Type | Attributes | Description |
| :--- | :--- | :--- | :--- |
| `id` | `String` | `@id @default(uuid())` | — |
| `productId` | `String` | FK | — |
| `variantId` | `String?` | FK, optional | — |
| `url` | `String` | | — |
| `altText` | `String?` | | — |
| `position` | `Int` | `@default(0)` | Sort order |
| `isPrimary` | `Boolean` | `@default(false)` | Main thumbnail flag |
| `createdAt`/`updatedAt` | `DateTime` | | — |

Relationships: `product` (belongs to, cascade), `variant` (belongs to, optional).

---

### 4. `Collection`
| Field | Type | Attributes | Description |
| :--- | :--- | :--- | :--- |
| `id` | `String` | `@id @default(uuid())` | — |
| `name` | `String` | | — |
| `slug` | `String` | `@unique` | — |
| `description` | `String?` | | — |
| `type` | `String` | `@default("manual")` | `manual` or `smart` |
| `ruleField` | `String?` | | Smart-rule target field |
| `ruleOperator` | `String?` | | `equals`, `contains` |
| `ruleValue` | `String?` | | — |
| `createdAt`/`updatedAt` | `DateTime` | | — |

Relationships: `products` (1-M CollectionProduct).

---

### 5. `CollectionProduct` (junction)
`collectionId`, `productId`, `position`. PK: `[collectionId, productId]`.

---

### 6. `Order`
| Field | Type | Attributes | Description |
| :--- | :--- | :--- | :--- |
| `id` | `String` | `@id @default(uuid())` | — |
| `orderNumber` | `String` | `@unique` | e.g. `#1001` |
| `customerId` | `String` | FK | — |
| `status` | `String` | `@default("Pending")` | `Pending`/`Confirmed`/`Cancelled`/`Completed` |
| `paymentStatus` | `String` | `@default("Unpaid")` | `Unpaid`/`Paid`/`Refunded` |
| `fulfillmentStatus` | `String` | `@default("Unfulfilled")` | `Unfulfilled`/`Fulfilled`/`Returned` |
| `paymentMethod` | `String` | `@default("COD")` | — |
| `totalPrice` | `Float` | | — |
| `subtotal` | `Float` | | — |
| `discountAmount` | `Float` | `@default(0)` | — |
| `refundAmount` | `Float` | `@default(0)` | — |
| `shippedViaPostex` | `Boolean` | `@default(true)` | — |
| `manualNetOverride` | `Decimal?` | | Accounting override |
| `manualFulfillmentCost` | `Decimal?` | | Accounting override |
| `notes` | `String?` | | — |
| `shippingAddress` | `Json` | | name/phone/city/address |
| `meta` | `Json?` | `@default("{}")` | — |
| `createdAt`/`updatedAt` | `DateTime` | | — |
| `deletedAt` | `DateTime?` | | Soft delete |

Relationships: `customer` (belongs to), `items` (1-M OrderItem), `shipment` (1-1), `fulfillmentCosts` (1-M).

---

### 7. `OrderItem`
| Field | Type | Attributes | Description |
| :--- | :--- | :--- | :--- |
| `id` | `String` | `@id @default(uuid())` | — |
| `orderId` | `String` | FK | — |
| `variantId` | `String` | FK | — |
| `productTitle` | `String` | | Snapshot at purchase time |
| `variantTitle` | `String` | | Snapshot at purchase time |
| `qty` | `Int` | `@default(1)` | — |
| `unitPrice` | `Float` | | — |
| `totalPrice` | `Float` | | `qty * unitPrice` |
| `sku` | `String` | | Snapshot |
| `createdAt`/`updatedAt` | `DateTime` | | — |

Relationships: `order` (belongs to, cascade), `variant` (belongs to).

---

### 8. `Customer`
| Field | Type | Attributes | Description |
| :--- | :--- | :--- | :--- |
| `id` | `String` | `@id @default(uuid())` | — |
| `name` | `String` | | — |
| `phone` | `String` | `@unique` | Primary identifier |
| `email` | `String?` | | Optional |
| `passwordHash` | `String?` | | Optional — nullable for guest checkout |
| `city`/`province`/`address` | `String` | | Default shipping |
| `totalOrders` | `Int` | `@default(0)` | Aggregate |
| `totalSpent` | `Float` | `@default(0)` | Aggregate |
| `createdAt`/`updatedAt` | `DateTime` | | — |
| `deletedAt` | `DateTime?` | | Soft delete |

Relationships: `orders` (1-M).

---

### 9. `Shipment`
| Field | Type | Attributes | Description |
| :--- | :--- | :--- | :--- |
| `id` | `String` | `@id @default(uuid())` | — |
| `orderId` | `String` | `@unique` FK | — |
| `postexCn` | `String?` | `@unique` | Consignment number |
| `bookingStatus` | `String` | `@default("Pending")` | — |
| `trackingStatus` | `String` | `@default("Pending")` | — |
| `bookedAt`/`deliveredAt` | `DateTime?` | | — |
| `codAmount` | `Float` | | — |
| `returned` | `Boolean` | `@default(false)` | RTO flag |
| `shippingCharges` | `Float` | `@default(0)` | — |
| `gst` | `Float` | `@default(0)` | — |
| `taxDeduction` | `Float` | `@default(0)` | — |
| `netAmount` | `Float` | `@default(0)` | — |
| `createdAt`/`updatedAt` | `DateTime` | | — |

Relationships: `order` (belongs to, cascade), `events` (1-M TrackingEvent).

*Note (per merge plan): Courier/shipment integration dropped from base merged product — future paid add-on.*

---

### 10. `TrackingEvent`
`id`, `shipmentId` (FK, cascade), `status`, `description`, `city`, `eventTime`, `createdAt`, `updatedAt`.

---

### 11. `Discount`
`id`, `code` (`@unique`), `type` (`fixed`/`percentage`), `value`, `appliesTo` (`all`/`collection`/`product`), `minOrder`, `usageLimit`, `timesUsed`, `startsAt`, `endsAt`, `status`, `createdAt`, `updatedAt`.

---

### 12. `Review`
`id`, `productId` (FK, cascade), `reviewerName`, `rating` (1-5), `title`, `body`, `isVerified`, `isApproved` (moderation flag), `images` (`String[]`), `reviewedAt`, `createdAt`, `updatedAt`.

---

### 13. `BlogArticle`
`id`, `title`, `slug` (`@unique`), `bodyHtml`, `excerpt`, `author`, `featuredImageUrl`, `status` (`Draft`/`Published`), `publishedAt`, `seoTitle`, `seoDescription`, `tags`, `createdAt`, `updatedAt`.

---

### 14. `Page`
`id`, `title`, `slug` (`@unique`), `bodyHtml`, `status` (`Active`/`Hidden`), `seoTitle`, `seoDescription`, `createdAt`, `updatedAt`.

---

### 15. `AnalyticsEvent`
`id`, `eventType`, `sessionId`, `productId`, `variantId`, `orderId`, `url`, `referrer`, `utmSource`, `utmMedium`, `utmCampaign`, `country`, `deviceType`, `ipHash`, `eventAt`, `createdAt`, `updatedAt`.

*Note (per merge plan): Meta Pixel/analytics dropped from base merged product — future paid add-on.*

---

### 16. `AdminUser`
`id`, `name`, `email` (`@unique`), `passwordHash`, `role` (`Admin`/`Manager`/`Support`), `lastLogin`, `createdAt`, `updatedAt`.

*Per merge plan: this is the pattern adopted for the merged system — admin/staff kept fully separate from customers.*

---

### 17. `Setting`
`id`, `key` (`@unique`), `value` (`Json`), `createdAt`, `updatedAt`. Flexible key-value config store.

*Per merge plan: this pattern adopted over Attireburg's fixed-field SiteSettings.*

---

### 18. `AccountingExpense`
OpEx tracking: `id`, `date`, `category`, `amount`, `vendor`, `paymentMethod`, `isRecurring`, `recurrenceFrequency`, `attachmentUrl`, `notes`, `createdBy`, `editedBy`, `editedAt`, `createdAt`, `updatedAt`.

*Note (per merge plan): Full accounting layer dropped from base merged product — future paid add-on.*

---

### 19. `SkuCostHistory`
`id`, `variantId` (FK, cascade), `unitCost`, `effectiveFrom`, `effectiveTo`, `notes`, `createdAt`, `updatedAt`.

---

### 20. `AdSpend`
`id`, `date`, `platform` (`Meta`/`Google`/`TikTok`), `campaignId`, `campaignName`, `adSetId`, `adSetName`, `spendAmount`, `impressions`, `clicks`, `metaReportedRevenue`, `metaReportedRoas`, `notes`, `createdAt`, `updatedAt`.

---

### 21. `FulfillmentCost`
`id`, `orderId` (FK, cascade), `courierName` (`@default("PostEx")`), `forwardFee`, `rtoFee`, `codHandlingFee`, `isRto`, `rtoReason`, `gstAmount`, `whtAmount`, `createdAt`, `updatedAt`. Unique: `[orderId, courierName]`.

---

### 22. `OwnerTransaction`
`id`, `date`, `type` (`Deposit`/`Withdrawal`), `amount`, `note`, `createdAt`, `updatedAt`.

---

### 23. `PostexSettlement`
`id`, `cprNumber` (`@unique`), `settlementDate`, `totalAmount`, `orderCount`, `notes`, `createdAt`, `updatedAt`.

---

### 24. `AbandonedCheckout`
`id`, `sessionId` (`@unique`), `name`, `phone`, `email`, `address`, `city`, `province`, `cart` (`Json`), `total`, `subtotal`, `discount`, `createdAt`, `updatedAt`.
