# StockWise: Healthy Cart + Discount Feature Design

**Date:** 2026-04-19  
**Status:** Approved

## Goal

When a customer adds items to a cart on the Find Food page, the app shows a live health breakdown. If 70%+ of cart items (by count) are healthy, the customer earns a 5% discount on their total. No checkout required — live badge only.

## Schema Change

Add `isHealthy: Boolean` to each inventory item embedded in the Store document.

```js
inventory: [{
  item: String,
  qty: Number,
  price: Number,
  category: String,
  isHealthy: Boolean   // NEW
}]
```

## Healthy vs Unhealthy Classification

### Healthy ✓
Fresh produce, whole grains, legumes, lean protein, dairy staples:
Bananas, Apples, Yuca, Plantains, Tomatoes, Onions, Collard Greens, Sweet Potatoes,
Oranges, Cabbage, Avocados, Limes, Cilantro, Jalapeños, Mangoes, Kale, Carrots,
Potatoes, Green Peppers, Whole Milk, Eggs (dozen), Yogurt, Rice (5lb),
Black Beans (can), Pinto Beans (can), Bread (whole wheat), Oatmeal,
Canned Tuna, Corn Tortillas

### Unhealthy ✗ (added to seed for realistic testing)
Processed/high-fat/high-sugar items added to each store inventory:
Chips (Lays), Soda (2L), Candy Bar, Butter, Cheese Slices, Instant Ramen,
White Bread, Fruit Punch (1L)

## Seed Update

Each store gets 2–3 unhealthy items added alongside existing healthy inventory.
All items get `isHealthy` field set.

## Cart Logic

- Cart = array of `{ item, price, qty, storeId, storeName, isHealthy }`
- Health % = `healthyCount / totalCount * 100` (by individual item units, not unique items)
- Discount: if health % ≥ 70 → apply 5% off subtotal
- Cart persists in `localStorage` so it survives page refresh

## Find Food Page Changes

### Add to Cart buttons
- Browse Items tab: each item card gets `+ Add` button
- Search results: each item chip gets `+ Add` button  
- Quantity defaults to 1, user can adjust in cart panel

### Cart Panel (fixed right sidebar on desktop, bottom drawer on mobile)
```
┌─────────────────────────────┐
│ 🛒 Your Cart (5 items)       │
├─────────────────────────────┤
│ Bananas ×2    $1.18    ✓    │
│ Chips    ×1   $2.99    ✗    │
│ Apples   ×2   $2.58    ✓    │
│ ...                          │
├─────────────────────────────┤
│ [████████░░] 80% healthy    │
│ 🟢 5% DISCOUNT EARNED       │
├─────────────────────────────┤
│ Subtotal:        $8.74       │
│ Discount (5%):  -$0.44       │
│ Total:           $8.30       │
├─────────────────────────────┤
│ [Clear Cart]                 │
└─────────────────────────────┘
```

## API Changes

None. `/api/items` already returns full inventory fields including `isHealthy`.
`/api/stores/:id/display` already returns full inventory.

## Files Changed

| File | Change |
|------|--------|
| `models/Store.js` | Add `isHealthy: Boolean` to inventory sub-schema |
| `seed.js` | Mark all items isHealthy, add 2–3 unhealthy items per store |
| `public/customer.html` | Add cart panel HTML |
| `public/js/customer.js` | Add cart logic + health % + discount calculation |
| `public/css/style.css` | Add cart panel styles |

## Out of Scope

- Solana payment integration (saved for checkout feature)
- Per-store cart (cart is global across stores)
- Saving cart to DB
