# StockWise Ward Demand Map Redesign

Date: 2026-07-12
Project: StockWise / GeorgeHacks
Status: Approved design direction, pending implementation plan

## Goal

Make StockWise feel innovative and presentable for a hackathon demo without turning it into a generic AI-branded product. The app should lead with a concrete civic supply-chain story: residents need food, corner stores have partial supply, and DCCK can act on demand signals by ward.

The redesign must stay local. GitHub is read-only except for pulls; no push or remote write action is in scope.

## Product Story

StockWise is the demand router for DC corner-store food access.

The demo should show one tight loop:

1. A resident searches for or requests a food item.
2. StockWise finds the best path: same-ward pickup, cross-ward transfer, or DCCK request.
3. Votes, requests, sales, and inventory become ward-level demand signals.
4. DCCK and store owners see what to stock, move, or prioritize next.

The signature feature is a Ward Demand Map. It does not need to be a GIS map. It should be a clear operational board for Wards 5, 7, and 8, showing stock pressure, requested items, transfer paths, and DCCK priority actions.

## Hard Design Constraints

- No generic AI product copy.
- No "powered by AI" hero positioning.
- No vague assistant hype, feature over-explaining, or filler marketing sections.
- No generic gradient-card or template SaaS look.
- No stock-photo filler.
- Keep AI visible as a practical tool, not the main product thesis.
- Keep GitHub untouched except for read-only pull/fetch operations.

## Experience Direction

The first screen should behave like a demo entry point, not a landing page. It should include:

- A concise thesis: "Route fresh food where DC actually needs it."
- Live or seeded counters, such as available items, open requests, SNAP activity, and priority demand.
- The Ward Demand Map as the visual anchor.
- Direct paths into the three core workflows: Find food, Record store activity, and Open DCCK dashboard.

The customer flow should make fulfillment status obvious:

- Pickup: available in the selected ward.
- Transfer: available from another ward with clear fee/coupon economics.
- DCCK priority: unavailable now, but requestable through the demand loop.

The community board should connect votes to ward priority instead of feeling like a separate poll page.

The DCCK dashboard should read like a command view: demand signals, store health, SNAP activity, low-stock risk, and next delivery priorities.

The chat experience should be framed as "Ask StockWise" and use practical prompts connected to real workflows, such as finding an item, checking low stock, or explaining reorder priority.

## Visual Direction

Use a restrained civic-operations identity. The current dark monospace theme should move away from a gamer-terminal feel and toward a public service command center.

Palette:

- Charcoal base for depth and focus.
- Off-white text for readability.
- Produce green for healthy inventory and completed actions.
- Transit blue for routes, transfers, and network movement.
- Tomato red for stock risk and urgent demand.
- Warm amber for warnings and marketplace/excess-stock actions.

Typography:

- Use a readable sans-serif for headings, body copy, forms, and navigation.
- Reserve monospace for metrics, route labels, timestamps, and compact operational data.
- Avoid negative letter spacing and oversized text inside compact dashboard surfaces.

Layout:

- Favor dense but clean operational surfaces.
- Use full-width sections and restrained panels.
- Keep cards for repeated items, metrics, modals, and tool surfaces.
- Avoid nested cards.
- Use route lines, ward chips, pressure bands, and small data labels as the signature visual language.

## Architecture

Keep the current architecture:

- Node.js + Express server in `server.js`.
- MongoDB/Mongoose models under `models/`.
- Existing routes under `routes/`.
- Static frontend pages under `public/`.
- Shared styling in `public/css/style.css`.
- Page behavior in `public/js/*.js`.

Prefer existing routes first:

- `/api/stores`
- `/api/search`
- `/api/requests`
- `/api/votes`
- `/api/dashboard`
- `/api/demand`
- `/api/items`

Only add a small API endpoint if the Ward Demand Map cannot be built cleanly from the existing route payloads. Any new endpoint should return aggregated ward-level data, not duplicate frontend calculations in multiple pages.

## Data Flow

The Ward Demand Map should combine:

- Store inventory by ward.
- Open requests by item and ward.
- Vote totals by item and ward.
- Recent sales and SNAP activity where available.
- Low-stock or out-of-stock risk.

The map should convert these into plain states:

- "Stocked"
- "Low stock"
- "Transfer available"
- "DCCK priority"
- "Community demand rising"

Customer actions should create or reuse the same demand signals visible to DCCK and store owners.

## Error Handling

Frontend fetch failures should show clear local messages instead of silent blanks.

Empty states should tell the user what is missing and what action is available:

- No matching item: request it or browse nearby alternatives.
- No demand data: ask residents to vote or request items.
- No selected store: choose a store before recording sales.
- AI unavailable: keep search, dashboard, and requests usable.

Auth redirects should remain role-aware and should not leave pages half-rendered.

## Testing And Verification

Baseline tests currently pass when run directly:

- `node tests/chat-auth.test.js`
- `node tests/sales-insights.test.js`

The aggregate command `node --test tests/*.test.js` can fail in this Windows shell with `spawn EPERM`, so verification should use direct test-file execution unless the environment changes.

Implementation verification should include:

- Existing direct Node tests.
- Server startup with seeded data.
- Main-page browser checks for `/`, `/customer`, `/community`, `/dashboard`, `/tablet`, and `/chatbot`.
- Browser console checks for errors.
- DOM checks that the Ward Demand Map renders populated data.
- Responsive checks for desktop and mobile widths.

## Out Of Scope

- Pushing to GitHub.
- Deploying to Vercel.
- Replacing Express/static frontend with a framework.
- Building full GIS integration.
- Rewriting authentication.
- Rewriting database models unless needed for a narrow aggregation endpoint.
- Making Gemini or any AI feature the main product thesis.

## Acceptance Criteria

- The first screen communicates the full StockWise loop in under ten seconds.
- Ward Demand Map is the most memorable visual and product element.
- Customer, community, owner, dashboard, and chat pages feel like one coherent product.
- AI copy is practical and secondary.
- No visible UI feels like generic AI-generated SaaS filler.
- Existing core workflows still work locally.
- Verification evidence includes tests, local startup, browser DOM, and console checks.
