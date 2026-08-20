# Living Feature Connection Checklist

This document tracks every UI element, intended action, route handler, and its end-to-end connection status throughout the build process.

> **Rule (BUILD_STANDARDS.md 1.2):** Every feature must be built vertically (UI + Route + Logic together) and verified end-to-end. Nothing is left half-wired silently. Update this table after every feature is completed.

---

## 1. Feature Connection Matrix

| Feature Domain | Element / Component | Intended Action | Route / Handler | Status |
| :--- | :--- | :--- | :--- | :--- |
| *Scaffold* | Project Base | Initialize Next.js, Prisma client, theme tokens & env | N/A | `Connected` |

---

## 2. Status Legend
- `Connected`: Fully wired, route handler implemented, database integrated, edge cases verified.
- `Not Connected`: UI scaffolded or route drafted, not yet fully integrated or verified.
