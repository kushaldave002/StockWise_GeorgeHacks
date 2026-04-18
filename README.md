# StockWise

### Connecting DC Food Desert Communities to Fresh Food Through Corner Stores

StockWise is a web platform built for the **George Hacks 2026 - Corner Store of the Future** challenge. It bridges the gap between underserved DC neighborhoods (Wards 5, 7, 8) and affordable fresh food by transforming corner stores into smart distribution points, powered by community demand and coordinated through DC Central Kitchen (DCCK).

---

## The Problem

Over 300,000 DC residents live in food deserts with limited access to fresh, affordable produce. Corner stores are everywhere in these neighborhoods but lack the data, coordination, and supply chain support to stock what communities actually need.

## The Solution

StockWise creates a three-way feedback loop between **customers**, **corner store owners**, and **DCCK** -- turning reactive stocking into demand-driven distribution.

```
Customer requests item
        |
        v
  +-----------+     Same ward?     +------------------+
  |  StockWise | ---- YES -------> | Tier 1: Pickup   |
  |   Engine   |                   | Ready now         |
  |            | ---- NO --------> | Tier 2: Transfer  |
  |            |   Other ward      | Ready tomorrow    |
  |            |   has it?         | + Transfer Econ.  |
  |            |                   +------------------+
  |            | ---- NOBODY ----> | Tier 3: DCCK      |
  |            |   has it          | Delivered in ~5d  |
  +-----------+                   +------------------+
        |
        v
  Community votes + request data
  = Demand signals for DCCK
```

---

## Features

### For Customers (`/customer`)
- **Search** for items across all stores, filtered by ward
- **Request** items not currently available -- triggers 3-tier fulfillment
- **Track** order status (reserved, in transit, ready for pickup)
- Receive **coupon codes** on cross-ward transfers

### For Store Owners (`/tablet`)
- **Record sales** with SNAP/EBT tracking
- **View inventory** with low-stock alerts
- **Sales analytics** -- top items, revenue, SNAP breakdown (Chart.js)
- **List excess stock** on the community marketplace before it expires

### For DCCK (`/dashboard`)
- **Network-wide analytics** -- sales by store, revenue, SNAP adoption
- **Demand signals** -- aggregated from customer requests + community votes
- **Bulk order recommendations** when demand score crosses threshold
- **Store health** -- flag stores with zero SNAP activity

### Community Board (`/community`)
- **Vote** for items you want stocked in your ward
- **Ward filtering** -- see what your neighborhood needs
- **Trending indicators** when items cross the vote threshold
- **Marketplace** -- browse excess stock from local stores

### Store Display (`/display`)
- Full-screen inventory display for in-store tablets or TVs
- Grouped by category with prices
- Auto-refreshes every 60 seconds

---

## Transfer Economics

When a customer requests an item that only exists in another ward, StockWise uses a shared economics model so **everyone benefits**:

| Party | What Happens |
|---|---|
| **Price** | 15% transfer markup applied to cover logistics |
| **Source Store** | Earns 10% commission on the item for supplying it |
| **Destination Store** | Receives the item to sell, keeps remaining margin |
| **Customer** | Gets a coupon equal to the markup -- effective price stays the same |

Example: Plantains at $0.79 from Ward 7, requested by Ward 5 customer

```
Original price:     $0.79
Transfer fee (15%): $0.12
Customer pays:      $0.91
Coupon received:    $0.12 (code: SW-XXXXXX)
Effective price:    $0.79

Source store earns:  $0.08 (10% commission)
Dest. store earns:   $0.71
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | Node.js, Express |
| Database | MongoDB (Mongoose ODM) |
| Frontend | Vanilla HTML/CSS/JS |
| Charts | Chart.js |
| Font | Cascadia Code (monospace) |
| Dev DB | mongodb-memory-server (zero-config) |

---

## Project Structure

```
stockwise/
├── server.js              # Express app, MongoDB connection, auto-seed
├── seed-data.js           # Auto-seeds 4 stores, sales, requests, votes
├── seed.js                # Standalone seed script
├── models/
│   ├── Store.js           # Store with embedded inventory array
│   ├── Sale.js            # Sale records with SNAP tracking
│   ├── Request.js         # Customer requests with 3-tier fulfillment
│   ├── Coupon.js          # SNAP auto-coupons + transfer coupons
│   ├── Vote.js            # Community demand votes
│   └── Listing.js         # Marketplace excess stock listings
├── routes/
│   ├── stores.js          # CRUD for stores
│   ├── sales.js           # Record sales, sales history + analytics
│   ├── requests.js        # 3-tier fulfillment engine
│   ├── search.js          # Cross-store item search
│   ├── listings.js        # Marketplace listings
│   ├── votes.js           # Community voting
│   ├── dashboard.js       # DCCK analytics aggregation
│   └── demand.js          # Demand scoring (requests + votes)
├── public/
│   ├── index.html         # Landing page
│   ├── customer.html      # Customer search + request portal
│   ├── tablet.html        # Store owner tablet interface
│   ├── dashboard.html     # DCCK analytics dashboard
│   ├── community.html     # Community voting board
│   ├── display.html       # In-store inventory display
│   ├── css/style.css      # Dark theme design system
│   └── js/
│       ├── customer.js    # Search, 3-tier fulfillment UI
│       ├── tablet.js      # Sales, inventory, analytics
│       ├── dashboard.js   # Charts, demand signals
│       ├── community.js   # Voting, marketplace
│       └── display.js     # Auto-refresh inventory display
└── package.json
```

---

## Getting Started

### Prerequisites

- Node.js 18+
- MongoDB (optional -- falls back to in-memory automatically)

### Install & Run

```bash
git clone https://github.com/bhushan7322/StockWise_GeorgeHacks.git
cd StockWise_GeorgeHacks
npm install
npm start
```

The server starts on `http://localhost:3000`. If MongoDB isn't installed locally, it automatically spins up an in-memory instance and seeds demo data (4 DC stores, ~200 sales, 15 requests, 10 vote entries).

### Environment Variables (optional)

Create a `.env` file:

```
MONGODB_URI=mongodb://localhost:27017/stockwise
PORT=3000
```

---

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/stores` | List all stores |
| `GET` | `/api/stores/:id/display` | Store inventory for display |
| `GET` | `/api/search?q=&ward=` | Search items across stores |
| `POST` | `/api/sales` | Record a sale (decrements stock) |
| `GET` | `/api/sales/:storeId?days=` | Sales history with analytics |
| `POST` | `/api/requests` | Submit item request (3-tier fulfillment) |
| `GET` | `/api/requests` | Recent requests |
| `PATCH` | `/api/requests/:id/status` | Update request status |
| `POST` | `/api/votes` | Vote for an item in a ward |
| `GET` | `/api/votes?ward=` | Get vote tallies |
| `POST` | `/api/listings` | List excess stock on marketplace |
| `GET` | `/api/listings` | Browse marketplace |
| `GET` | `/api/dashboard` | DCCK analytics (sales, SNAP, stores) |
| `GET` | `/api/demand` | Demand signals (requests + votes) |

---

## Pages

| Route | Purpose | User |
|---|---|---|
| `/` | Landing page | Everyone |
| `/customer` | Search items, submit requests, track orders | Residents |
| `/tablet` | Record sales, manage inventory, list excess | Store Owners |
| `/dashboard` | Network analytics, demand signals, SNAP data | DCCK |
| `/community` | Vote for items, browse marketplace | Community |
| `/display?store=ID` | Full-screen inventory board | In-Store TV |

---

## How It Works

1. **Customer searches** for an item on `/customer`
2. **StockWise checks all stores** across DC wards
3. **3-tier fulfillment** kicks in:
   - **Pickup** -- item is in a same-ward store, reserved immediately
   - **Transfer** -- item exists in another ward, transferred to local store with shared economics
   - **DCCK** -- nobody has it, added to DCCK's next delivery cycle
4. **Community votes** on `/community` aggregate with request data to create **demand signals**
5. **DCCK dashboard** uses demand signals to prioritize bulk orders and deliveries
6. **Store owners** track sales and SNAP usage on `/tablet`, list excess stock before expiry

---

## Built For

**George Hacks 2026 -- Corner Store of the Future**

DC Central Kitchen (DCCK) Healthy Corners Program challenge to leverage technology for improving fresh food access in DC's food deserts.

---

## Team

Built by the StockWise team at George Hacks 2026.

---

## License

ISC
