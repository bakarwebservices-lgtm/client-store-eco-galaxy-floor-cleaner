# AWWeb SaaS Merger Plan — Attireburg + Vortex Rings

*Status: Concept & planning stage only. Nothing built yet. Update this doc as the plan evolves.*

---

## 1. The Concept

Once Attireburg and Vortex Rings are fully wrapped, don't jump straight to a generic multi-tenant SaaS platform. Instead:

- Keep building **fully custom sites per new client**, same as now.
- Every new client build starts from a **combined feature baseline** merging what both projects proved out:
  - **From Attireburg:** deep account/user management, customer login & data storage, highly granular product editor (variants, sizes, weight, shipping tiers), comprehensive order handling.
  - **From Vortex Rings:** real-time P&L tracking, third-party API integrations (e.g. PostEx), analytics dashboards, admin accounting logic.
- Pitch target: **Shopify merchants** frustrated with platform limitations, monotonous themes, and lack of control.
- After 3–4 more client builds on this combined baseline, patterns will be clear enough to actually generalize into a true multi-tenant SaaS product. Don't try to build that generic version first — that's the trap that causes procrastination/stalling.

---

## 2. Business Model

- **Pricing:** Hybrid — small one-time onboarding/setup fee (covers semi-custom build time) + **recurring monthly subscription** (covers hosting, support, ongoing features).
- **Why not pure one-time payment:** Kills incentive to maintain/improve, harder to fund future feature work, and this product requires ongoing admin tooling + integration maintenance.
- **Tiers (draft):**
  | Tier | Includes |
  |---|---|
  | **Basic** | Custom storefront, standard product management (variants/sizes), basic order handling, simple admin dashboard |
  | **Premium** | + Real-time P&L, third-party API integrations (courier/shipping), analytics dashboards |
  | **Premium Plus** | + Deep account management, customer self-service accounts, granular product editing, priority support, custom integrations on request |
- **Rule to hold the line:** Don't over-deliver premium features to basic-tier clients — undercuts pricing before the model is proven.
- **Super Admin layer:** Needed once managing multiple client instances — handles subscriptions, billing, feature flags per tier, usage monitoring across all merchants. (Technical build — later.)

### Super Admin — Architecture Decision
- **Near-term (now):** Each client gets a **separate deployment** — same underlying codebase/theme system, but genuinely separate instances. Super Admin is an outside dashboard that pings each instance for subscription status, uptime, and usage, and lets features be toggled per client by updating that client's config — not runtime permission switching.
- **Why not shared/multi-tenant now:** True shared infrastructure (one system, tenant isolation, runtime feature switching) is a much bigger engineering lift and is exactly the kind of jump that causes stalling before anything ships. Doesn't match where the business is right now (still doing custom builds per client).
- **Long-term (end goal):** One unified system — Super Admin manages everything, all clients live inside one platform, features/access controlled centrally at runtime. This is the eventual target, not the starting point.
- **Why this sequencing works:** Living through several separate deployments first is what generates the real knowledge of what's actually generic vs. client-specific — that knowledge is what makes the eventual multi-tenant build correct instead of guessed at.

---

## 3. Pitch / Value Proposition

Things to explicitly sell as *features*, not just background work:

1. **Shopify data migration** — de-risks switching, client's #1 fear.
   - Path A: Shopify Admin API (if client can generate API credentials) — pull products, variants, customers, orders programmatically.
   - Path B: Shopify's built-in bulk CSV export (simpler for non-technical clients) — then run through one reusable import/mapping script.
   - Build the import script once, reuse for every future Shopify client.
2. **Security** — regular security audits as a stated feature (already doing this internally — most small Shopify stores never get this).
3. **Speed/performance** — custom-built typically beats Shopify; back with real numbers (page load times) in the pitch.
4. **Hands-on onboarding** — guided walkthrough/checklist for the new admin panel; reduces fear of losing control.

---

## 4. Technical / Build Structure Discussion

### 4.1 Git & Version Control
- Two branches: **main** (always stable/live) and **development** (active work).
- Merge to main only after **local testing** — and testing means more than "it ran without crashing": check edge cases (empty fields, unusual values), not just the happy path.
- Commit messages written by the IDE agent, detailed — doubles as searchable project history. No separate manual log file needed for this purpose.

### 4.2 Architecture Reference Files (the "map")
- Purpose: stop the agent (and Abubakar) from having to scan the whole codebase to find/fix something — direct index instead.
- Two living markdown files at project root:
  - **Architecture map:** major system parts (products, orders, payments, admin, etc.) → which files/folders contain that logic.
  - **Schema file:** database tables, fields, relationships.
- **Drift risk:** a stale map is worse than no map. Mitigation: agent verifies the map against actual code **before starting any task**, but only for the specific files it's about to touch — not a full codebase scan. Keeps token cost low while preventing drift.

### 4.3 Theme / UI Config
- Recurring pain point from Vortex Rings: re-prompting the agent repeatedly to change colors across the site — tedious and token-expensive.
- Fix: single **theme/design-tokens file** — all colors, fonts, spacing defined once as named variables (e.g. `primary-color`, `accent-color`). Every component references the variable, never a hardcoded value.
- Rebranding a client site = change values in one file, cascades everywhere.
- Should be editable by admins directly (not just via IDE prompts) for client-driven theme changes.

### 4.4 Codebase Structure & Consistency
- Consistent folder structure: one folder per feature (products, orders, payments, etc.) — predictable, agent and human both know where to look.
- Shared/reusable components (buttons, cards, form inputs) — not rewritten per page.

### 4.5 UI-to-Route Connection Problem (recurring issue on both prior projects)
- Problem: UI gets built, but the button/route/backend logic isn't actually wired up — happened repeatedly on Attireburg and Vortex Rings.
- Fix: build **vertically, one feature at a time, end-to-end** (UI + route + backend logic together, tested together) rather than building all UI first and wiring logic later.
- Tracking mechanism: simple feature checklist/table in the project — element, intended action, route, status (connected / not) — so nothing slips through silently.

### 4.6 Other Failure Patterns to Avoid (new, from this discussion)
- **Inconsistent data shapes** between frontend/backend — define shared data structures (e.g. what a "product" or "order" object looks like) once, in a shared reference, both sides use it.
- **No centralized error handling** — decide one consistent approach for catching/logging/displaying errors across the whole app, not ad hoc per feature.
- **Environment mixing** — keep development and production configs strictly separate (e.g. test payment credentials must never reach production).
- **Inconsistent input validation** — one form validates properly, another doesn't, bad data slips into the DB. Needs a consistent validation approach across all forms.

---

## 5. Critique — Loopholes & Open Risks

Being direct rather than just affirming the plan:

1. **"Tested locally" is still a low bar.** Even with the edge-case awareness above, without a real test checklist (empty inputs, boundary values, wrong file types, concurrent actions) bugs will still slip through, especially since Abubakar isn't reading the code line-by-line to catch subtle logic errors himself. Worth defining a minimal but concrete pre-merge checklist rather than leaving "test it" open-ended.
2. **Architecture map still relies on the agent behaving consistently.** Scoped verification (just touched files) is efficient, but there's no hard enforcement — if a task is done without invoking that check first (human forgets to prompt for it, or agent skips it), drift resumes silently. This is a process discipline risk, not just a technical one.
3. **Tier boundaries are still fuzzy in practice.** "Basic gets X, Premium gets Y" is clean on paper, but the moment a Basic client asks for one Premium feature "just this once," there's no defined process for how to say no (or what a paid add-on looks like) — this is where scope creep actually happens, not in the initial pitch.
4. **Migration path B (CSV export) is more fragile than it sounds.** Non-technical clients doing manual CSV exports are prone to incomplete exports, wrong date ranges, or missing image assets — the "one reusable import script" assumes clean, consistent input, which won't always be true. Needs a validation/error-reporting step in the import process itself, not just a happy-path script.
5. **No defined trigger point for "generalize into real SaaS."** The plan says "after 3-4 more clients," but there's no concrete criterion for *what* signals readiness (e.g., feature X was requested identically by 3+ clients) — without that, "later" can drift indefinitely, same procrastination risk as trying to build it too early.
6. **Super Admin layer is currently undefined scope.** It's acknowledged as needed but has zero shape yet — billing logic, feature-flagging per tier, and cross-client monitoring are each nontrivial builds on their own and will need their own planning pass before technical work starts.

---

## 6. Schema Merge Decisions (Phase 1 groundwork)

Comparing Attireburg's and Vortex Rings' schemas (from generated SCHEMA.md/ARCHITECTURE.md files) to design the merged data model. Decisions locked so far:

- **ID format:** Use `uuid()` across the merged system (Vortex's convention) — more widely supported, better maintained than `cuid()`.
- **Admin/staff identity:** Keep completely separate from customers (Vortex's `AdminUser` pattern), not a flag on the customer table. Reasons: isolates admin auth from customer auth attack surface (a customer-side auth bug can't touch admin accounts), and supports a real `role` field (Admin/Manager/Support) for tiered staff permissions — needed for a serious multi-client platform.
- **Customer identity:** Support both guest checkout and full account creation on the *same* underlying Customer record — password/login fields stay optional (nullable). A guest who later creates an account gets the password added to their existing record rather than creating a duplicate — avoids order-history fragmentation/migration.
- **Guest checkout with an email that matches an existing account:** Do **not** auto-login (security risk — would allow account takeover by guessing/knowing someone's email). Do **not** hard-block checkout either (adds friction at the highest-value moment). Instead: let the guest checkout complete normally, flag the order internally as "possibly belongs to existing account," and follow up by email offering to link the order to their account after the fact.
- **Order/OrderItem:** Adopt Vortex's richer pattern — separate `paymentStatus` and `fulfillmentStatus` fields (not one combined status), and snapshot product/variant titles on the order item at time of purchase (protects order history if a product is later renamed/deleted).
- **Settings:** Adopt Vortex's flexible key-value `Setting` model over Attireburg's fixed-field `SiteSettings` — scales without schema changes as new config needs come up.
- **Bilingual legal pages (Attireburg's `LegalContent`, DE/EN):** Excluded from the generic merged product — client-specific request, not a generic SaaS feature. Can be added back per-client if a future client needs it.

### 6.1 Direction Update — Pricing Model & Scope Pivot (supersedes earlier tier/subscription plan)

After further thought, the plan shifted from a tiered subscription model to a simpler, faster-to-market offer:

- **Pricing:** No subscription. One flat one-time price. Pitch is explicitly "Shopify-equivalent power, zero monthly fee" — cost savings is the whole pitch, not extra capability.
- **Trade-off acknowledged:** No recurring revenue base — income only grows by finding new clients. Optional future consideration: a separate, clearly-optional paid support/maintenance add-on alongside the one-time build, without breaking the "no subscription" pitch.
- **Scope cut — integrations:** Meta Pixel/conversions API, PostEx-style courier API integration, and the full accounting layer (P&L, ad spend, COGS tracking) are **dropped from the base product**. Reasoning: go for market entry now, sell what's being asked for, not speculative value-adds. These become **future paid add-ons per client**, not part of the base build.
- **Scope cut — SEO tooling:** A dedicated SEO management section (per-page/per-product meta fields, alt text editor, etc.) is **dropped from the base product** for the same reason — nobody's asked for it yet. Also held as a **future paid add-on**.
- **"Fully editable" admin scope, clarified:** Text content across pages/products, theme colors, and logo/branding image — all admin-editable without touching code. Structural layout and design stay fixed (that's the quality differentiator vs. generic Shopify themes).
- **Base product target:** A comprehensive merge of Attireburg + Vortex's *core* store features (products, cart, checkout, orders, reviews, coupons, discounts, full admin management) — genuinely comparable to a complete Shopify store experience, minus the dropped integrations/SEO/accounting layer.
- **Tier system (Basic/Premium/Premium Plus) from section 6 above is superseded by this simpler model for now** — the tier breakdown remains in this doc as reference in case a tiered/subscription approach is revisited later, but is not the current build target.


- `ProductImage` as its own table (Vortex) vs. plain image URL array (Attireburg)
- `Collection`/`CollectionProduct` (Vortex) vs. simpler `Category` (Attireburg)
- Whether to fold in Attireburg-only features (Cart/CartItem, Wishlist, Newsletter, ContactMessage, Backorder/Waitlist/Restock system) — likely yes, since the point of the merge is a superset of both feature sets, but not yet explicitly confirmed per-feature.
- Whether to fold in Vortex-only features (Shipment/TrackingEvent, full accounting layer, AnalyticsEvent/Meta pixel, BlogArticle/Page, AbandonedCheckout) — same as above.

---

## 7. Phased Roadmap

The end goal (one unified Super Admin platform) is deliberately the *last* phase, not the first. Each phase below should be genuinely finished and working before starting the next one.

### Phase 1 — Merge the concept into one working template
- Reconcile Attireburg's schema/auth/admin logic with Vortex Rings' schema/auth/admin logic into a single combined codebase — this is the real technical starting point, not UI first.
- Build the theme/design-tokens config so styling is centralized from day one.
- Set up the architecture map + schema reference files for this merged codebase, and the Git main/development workflow.
- Build one feature end-to-end at a time (UI + route + backend together), using the feature checklist to prevent the button-not-wired-up problem.
- **Exit criteria:** a working, tested, merged template that could realistically be handed to a new client — no live client yet.

### Phase 2 — First real client on the merged template
- Pitch and onboard the first new Shopify-refugee client using the merged template as the base, with a first pass at tier packaging (Basic/Premium/Premium Plus) even if pricing isn't finalized.
- Deploy as a **separate instance** for this client — no Super Admin yet, manage manually.
- Run the CSV migration process manually and thoroughly for this client, refining the mapping/import approach based on what actually goes wrong.
- **Exit criteria:** one live, paying client running on the merged template.

### Phase 3 — Repeat with 2–3 more clients, watching for patterns
- Each new client is still a separate deployment, but each one should get faster since the base template is already proven.
- Actively track: which features every client needs (truly generic) vs. which features vary client-to-client (truly custom). This is the data that phase 4 depends on.
- Start manually tracking each client's subscription/tier/status somewhere simple (even a spreadsheet) — this becomes the spec for Super Admin later.
- **Exit criteria:** 3–4 live clients, and a clear written sense of what's generic vs. custom across them.

### Phase 4 — Build Super Admin (still separate-deployments model)
- Build the outside dashboard: per-client subscription status, uptime, usage, and per-client feature config toggling.
- No shared infrastructure yet — this just replaces the manual spreadsheet tracking from Phase 3 with a real tool.
- **Exit criteria:** all active clients visible/manageable from one dashboard, still on separate deployments.

### Phase 5 — Full unified multi-tenant platform (the end goal)
- Only attempt once Phase 3's "generic vs. custom" picture is solid and Phase 4's dashboard is already in daily use.
- Migrate from separate deployments to one shared platform with proper tenant isolation and runtime feature/access control per client.
- **Exit criteria:** this is the finished product — the actual sellable SaaS.

---

## 8. Status / Next Steps

### Handoff Instructions for the IDE Agent (Phase 1 kickoff)
When starting Phase 1 in the IDE, point the agent at the `merge-reference-docs/` folder (attireburg-ARCHITECTURE.md, attireburg-SCHEMA.md, vortex-rings-ARCHITECTURE.md, vortex-rings-SCHEMA.md) plus this plan doc, and explicitly instruct it to follow these rules from the start, not as an afterthought:

1. **Build vertically, one feature at a time.** For each feature, build the UI, the route, and the backend logic together and confirm the button/action actually works end-to-end before moving to the next feature. This directly targets the recurring problem from both prior projects — UI getting built with buttons not wired to working routes. Do not build all UI first and connect logic later.
2. **Maintain the feature checklist as you go** — element, intended action, route, status (connected/not) — so nothing is left half-wired silently.
3. **Generate and keep ARCHITECTURE.md and SCHEMA.md current for the new merged project**, updating them immediately whenever something meaningful changes — not after the fact.
4. **Before starting any task, verify the architecture map against the actual code for the specific files about to be touched** (not a full codebase scan) — keeps the map trustworthy without burning excess tokens.
5. **Use the theme/design-tokens config file** for all colors/fonts from the start, not hardcoded values.
6. **Git workflow:** main branch always stable, development branch for active work, merge only after local testing (including basic edge cases, not just the happy path), detailed agent-written commit messages.
7. Reference section 6 of this doc for the actual merged schema decisions (ID format, admin/customer separation, guest checkout handling, Order/OrderItem structure, Settings model) and section 6.1 for the current scope (no subscription, no integrations/SEO/accounting in base build).



- Concept: **cleared**, per this document.
- Currently finishing: Attireburg (product additions from WooCommerce) and Vortex Rings (product/image additions) — both effectively complete, no blockers.
- Not yet started: any technical build of the merged template.
- Next discussion needed (before any building): pre-merge testing checklist, tier scope-creep policy, CSV migration validation approach, Super Admin scope.
