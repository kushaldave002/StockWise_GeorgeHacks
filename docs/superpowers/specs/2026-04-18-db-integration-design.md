# StockWise: Full MongoDB Integration Design

**Date:** 2026-04-18  
**Status:** Approved

## Problem

MongoDB Atlas has the complex `CornerStore`+`Inventory`+`Product`+`SaleTransaction` schema from a prior integration. All Express routes use the simple `Store` (embedded inventory) + `Sale` schema. Result: search, display, sales, dashboard all return nothing or error against real DB data. `requests`, `votes`, `listings`, `coupons` collections are empty (0 docs).

## Decision

Use the **simple schema** (Store with embedded inventory array). Re-seed Atlas with correct data. Small blast radius — routes are mostly correct, just broken against wrong DB schema.

Complex schema fields (hours, thresholds, supplier) are unused by any current frontend page and not worth the route rewrite cost.

## Schema

### `stores` collection
```js
{
  name: String,
  address: String,
  ward: Number,
  lat: Number,
  lng: Number,
  characteristics: {
    acceptsSNAP: Boolean,
    acceptsWIC: Boolean,
    hasRefrigeration: Boolean
  },
  inventory: [{
    item: String,
    qty: Number,
    price: Number,
    category: String   // "produce" | "dairy" | "pantry" | "meat" | "frozen"
  }]
}
```

### `sales` collection
```js
{
  store: ObjectId (ref Store),
  item: String,
  qty: Number,
  price: Number,
  isSnap: Boolean,
  date: Date
}
```

### `requests` collection
```js
{
  customerName: String,
  item: String,
  ward: Number,
  status: String,        // "pending"|"reserved"|"in_transit"|"ready"|"completed"|"cancelled"
  fulfillment: String,   // "pickup"|"transfer"|"dcck"|"none"
  timestamp: Date,
  estimatedReady: Date,
  sourceStore: { name, address, stock: { item, qty, price } },
  destinationStore: { name, address }
}
```

### `votes` collection
```js
{
  item: String,
  ward: Number,
  count: Number,
  voters: [String]
}
```

### `listings` collection
```js
{
  store: ObjectId (ref Store),
  item: String,
  qty: Number,
  price: Number,
  expiry: Date
}
```

### `coupons` collection
```js
{
  code: String,
  amount: Number,
  storeId: ObjectId,
  used: Boolean,
  createdAt: Date
}
```

## Atlas Migration

Drop and re-seed all collections with simple schema data. Existing fixture data (complex schema) is replaced. The `stockouts` collection is left untouched (not used by any route).

## API Routes

| Method | Path | Description | Change |
|--------|------|-------------|--------|
| GET | `/api/stores` | List all stores (name, address, ward) | Fix — Store model now matches DB |
| GET | `/api/stores/:id/display` | Store + full inventory | Fix — same |
| GET | `/api/search?q&ward` | Search inventory across stores | Fix — was querying wrong schema |
| **GET** | **`/api/items?ward&category`** | **Browse all items across stores** | **New endpoint** |
| POST | `/api/sales` | Record a sale, decrement inventory qty in store doc | Fix — Sale schema + add inventory decrement |
| GET | `/api/sales/:storeId?days` | Sales history for a store | Fix — Sale schema |
| GET | `/api/requests` | List recent requests | No change needed |
| POST | `/api/requests` | Submit a request, trigger fulfillment logic | No change needed |
| GET | `/api/votes?ward` | List vote items by ward | No change needed |
| POST | `/api/votes` | Cast a vote | No change needed |
| GET | `/api/listings` | List excess stock marketplace | No change needed |
| POST | `/api/listings` | Post excess stock | No change needed |
| GET | `/api/dashboard` | DCCK aggregate stats | Fix — uses SaleTransaction, should use Sale |
| GET | `/api/demand` | Demand signals (votes + requests) | No change needed |

### New: `GET /api/items`

Returns all in-stock items across stores, joined with store info. Supports `?ward=` and `?category=` filters.

Response shape:
```json
[
  {
    "category": "produce",
    "items": [
      {
        "item": "Bananas",
        "price": 0.59,
        "stores": [
          { "_id": "...", "name": "Ward 7 Corner Market", "ward": 7, "qty": 25 }
        ]
      }
    ]
  }
]
```

## server.js Cleanup

Remove `getAllStoresWithInventory()` and `getSalesForStore()` dual-schema helpers. The chatbot endpoint will query `Store` and `Sale` directly. No more fallback logic.

## Find Food Page (customer.html / customer.js)

### Default view (two tabs)

**Tab 1: Browse Items**
- Shows all in-stock items grouped by category (Produce, Dairy, Pantry, Meat, Frozen)
- Ward filter applies
- Each item shows: name, price range, number of stores carrying it
- Expand item to see which stores have it + qty

**Tab 2: Browse Stores**
- Store cards: name, ward badge, address, SNAP/WIC badges
- Click store card → inline inventory list for that store

### Search behavior
- Typing in search box + clicking Search overwrites both tabs with search results (existing behavior, no change)
- Clearing search restores the browse tabs

## Seed Data

### Stores (4)
- Ward 7 Corner Market — Ward 7
- MLK Fresh Stop — Ward 8
- H Street Mini Mart — Ward 5
- Congress Heights Grocery — Ward 8

Each with 10 inventory items (mix of produce, dairy, pantry).

### Sales (~100 docs)
Generated across 14 days, all 4 stores, 40% SNAP rate.

### Requests (15 docs)
Mix of: 5 pickup, 4 transfer, 3 dcck, 3 pending statuses.

### Votes (10 docs)
Items: fresh greens, plantains, halal meat, yuca, mangoes, tilapia, okra, goat meat, avocados, cassava — across wards 5/7/8.

### Listings (4 docs)
One per store, perishable items at discount price.

### Coupons (4 docs)
Generated from transfer requests (existing logic preserved).

## Pages: What Changes

| Page | Change |
|------|--------|
| Find Food | Add two-tab browse default; new `/api/items` call |
| Store Tablet | No change — already correct once schema fixed |
| DCCK Dashboard | No change to JS — route fix handles it |
| Community Board | No change — votes + listings work once seeded |
| Display/Kiosk | No change |
| Chatbot | server.js cleanup only |

## Out of Scope

- Auth / user accounts
- Real-time notifications
- Map view
- Mobile-native app
