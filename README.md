<div align="center">

<img src="https://img.shields.io/badge/George_Hacks-2026-00d47b?style=for-the-badge&labelColor=0a0e14" alt="George Hacks 2026"/>
<img src="https://img.shields.io/badge/Corner_Store-of_the_Future-4da6ff?style=for-the-badge&labelColor=0a0e14" alt="Corner Store of the Future"/>
<img src="https://img.shields.io/badge/DCCK-Healthy_Corners-ff9f43?style=for-the-badge&labelColor=0a0e14" alt="DCCK Healthy Corners"/>

<br/><br/>

```
  ____  _             _   __        ___
 / ___|| |_ ___   ___| | _\ \      / (_)___  ___
 \___ \| __/ _ \ / __| |/ /\ \ /\ / /| / __|/ _ \
  ___) | || (_) | (__|   <  \ V  V / | \__ \  __/
 |____/ \__\___/ \___|_|\_\  \_/\_/  |_|___/\___|
```

### Connecting DC Food Desert Communities to Fresh Food Through Corner Stores

<br/>

<img src="https://img.shields.io/badge/node.js-18+-339933?style=flat-square&logo=nodedotjs&logoColor=white" alt="Node.js"/>
<img src="https://img.shields.io/badge/MongoDB-Atlas-47A248?style=flat-square&logo=mongodb&logoColor=white" alt="MongoDB"/>
<img src="https://img.shields.io/badge/Gemini_AI-Flash-4285F4?style=flat-square&logo=google&logoColor=white" alt="Gemini AI"/>
<img src="https://img.shields.io/badge/Express-4.x-000000?style=flat-square&logo=express&logoColor=white" alt="Express"/>
<img src="https://img.shields.io/badge/Chart.js-Visualizations-FF6384?style=flat-square&logo=chartdotjs&logoColor=white" alt="Chart.js"/>

</div>

---

## The Problem

> **Over 300,000 DC residents** live in food deserts with limited access to fresh, affordable produce. Corner stores exist in every neighborhood but lack the data, coordination, and supply chain support to stock what communities actually need.

## The Solution

StockWise creates a **three-way feedback loop** between customers, corner store owners, and DC Central Kitchen (DCCK) -- turning reactive stocking into **demand-driven distribution**.

```
                         Customer searches or requests item
                                       |
                                       v
                    +------------------------------------------+
                    |           StockWise Engine                |
                    |   (Real-time inventory across all wards) |
                    +------------------------------------------+
                         /           |            \
                        v            v             v
               +------------+  +-------------+  +-------------+
               |  TIER 1    |  |   TIER 2    |  |   TIER 3    |
               |  Pickup    |  |  Transfer   |  |    DCCK     |
               |            |  |             |  |   Delivery  |
               | Same ward  |  | Cross-ward  |  |  Nobody has |
               | Ready now  |  | Next day    |  |  it: ~5 days|
               |            |  | + Economics |  |             |
               +------------+  +-------------+  +-------------+
                                       |
                                       v
                    Community votes + request data = Demand signals
                              fed back to DCCK
```

---

## Features at a Glance

<table>
<tr>
<td width="50%">

### For Customers
- Search items across all stores by ward
- Add to cart with live pricing
- **15% transfer fee** on cross-ward items
- **5% healthy discount** (70%+ healthy cart)
- Checkout with **Card / SNAP-EBT / Cash**
- Earn **coupon codes** on transfer purchases
- Request unavailable items (3-tier fulfillment)

</td>
<td width="50%">

### For Store Owners
- Record sales with SNAP/EBT tracking
- Real-time inventory & low-stock alerts
- Sales analytics with Chart.js visualizations
- List excess stock on community marketplace
- AI-powered restock recommendations
- Place reorder via natural language

</td>
</tr>
<tr>
<td width="50%">

### AI Assistant (Gemini)
- Natural language queries on live data
- **Customer mode**: find products, compare prices
- **Owner mode**: sales trends, restock suggestions
- Conversation memory across messages
- Action buttons for one-click reordering
- Retry logic for API rate limits

</td>
<td width="50%">

### DCCK Dashboard
- Network-wide sales & revenue analytics
- SNAP adoption rates by store
- Aggregated demand signals (requests + votes)
- Bulk order recommendations
- Store health monitoring
- Ward-level food access insights

</td>
</tr>
</table>

### Community Board
Vote for items your neighborhood needs | Ward filtering | Trending indicators | Browse excess stock from local stores

### Authentication
Secure JWT-based login | Customer & Owner roles | Role-based access control | Persistent sessions

---

## Transfer Economics

When a customer orders from a different ward, a **shared economics model** ensures everyone benefits:

```
  Customer in Ward 5 orders Plantains from Ward 7 store

  Original price:          $0.79
  Transfer fee (15%):    + $0.12
  ────────────────────────────────
  Customer pays:           $0.91
  Coupon received:       - $0.12  (code: SW-A1B2C3)
  Effective price:         $0.79

  ┌─────────────────────────────────────────────┐
  │  Source Store (Ward 7)   earns $0.08  (10%) │
  │  Dest. Store (Ward 5)    earns $0.71        │
  │  Customer                gets coupon back   │
  └─────────────────────────────────────────────┘
```

| Party | Benefit |
|:---|:---|
| **Customer** | Gets coupon equal to markup -- effective price stays the same |
| **Source Store** | Earns 10% commission for supplying the item |
| **Destination Store** | Receives item to sell, keeps remaining margin |
| **DCCK** | Gains demand data to optimize future deliveries |

---

## Shopping Cart & Checkout

```
  ┌──────────────────────────────────────┐
  │  YOUR CART                      x    │
  │──────────────────────────────────────│
  │  Your Ward: [Ward 5 v]              │
  │                                      │
  │  Plantains x2        $1.58          │
  │    (transfer)                        │
  │  Kale x1              $2.49          │
  │  Apples x3            $5.97          │
  │──────────────────────────────────────│
  │  Subtotal              $9.04         │
  │  Transfer fee (15%)   +$0.24         │
  │  Healthy discount (5%) -$0.46        │
  │  ───────────────────────────         │
  │  Total                 $8.82         │
  │                                      │
  │  [  Place Order  ]                   │
  └──────────────────────────────────────┘
           │
           v
  ┌──────────────────────────────────────┐
  │  CHECKOUT                       x    │
  │──────────────────────────────────────│
  │  Payment Method:                     │
  │  [ Card ] [ SNAP/EBT ] [ Cash ]     │
  │                                      │
  │  Card Number: [________________]     │
  │  Expiry: [__/__]  CVV: [___]        │
  │                                      │
  │  Coupon: [________] [Apply]         │
  │                                      │
  │  Total: $8.82                        │
  │  [  Pay Now  ]                       │
  └──────────────────────────────────────┘
```

---

## Tech Stack

| Layer | Technology | Purpose |
|:---|:---|:---|
| **Backend** | Node.js + Express | REST API, routing, 3-tier fulfillment |
| **Database** | MongoDB (Mongoose ODM) | Stores, inventory, sales, requests |
| **AI** | Google Gemini 3 Flash | Natural language chatbot with live data |
| **Auth** | JWT + bcrypt | Secure login, role-based access |
| **Frontend** | Vanilla HTML/CSS/JS | Fast, no-framework UI |
| **Charts** | Chart.js | Sales analytics, SNAP tracking |
| **Design** | Cascadia Code, Dark Theme | Modern monospace aesthetic |
| **Dev DB** | mongodb-memory-server | Zero-config local development |

---

## Quick Start

### Prerequisites

- **Node.js** 18+
- **MongoDB** (optional -- auto-falls back to in-memory)
- **Gemini API Key** (for AI chatbot)

### Install & Run

```bash
# Clone the repository
git clone https://github.com/bhushan7322/StockWise_GeorgeHacks.git
cd StockWise_GeorgeHacks

# Install dependencies
npm install

# Create environment file
cp .env.example .env   # then fill in your keys

# Start the server
npm start
```

> If MongoDB isn't installed locally, StockWise automatically spins up an in-memory instance and seeds demo data: **4 DC stores**, **~200 sales**, **15 requests**, and **10 vote entries**.

### Environment Variables

```env
GEMINI_API_KEY=your_gemini_api_key
MONGODB_URI=your_mongodb_connection_string
PORT=3000
JWT_SECRET=your_jwt_secret
```

---

## Project Structure

```
stockwise/
├── server.js                # Express app, Gemini AI, MongoDB connection
├── seed-data.js             # Auto-seeds stores, sales, requests, votes
├── middleware/
│   └── auth.js              # JWT verification & role-based access
├── models/
│   ├── Store.js             # Store with embedded inventory
│   ├── User.js              # User auth (bcrypt hashed passwords)
│   ├── Sale.js              # Sales with SNAP tracking
│   ├── Request.js           # 3-tier fulfillment requests
│   ├── Coupon.js            # Transfer & SNAP coupons
│   ├── Vote.js              # Community demand votes
│   ├── Listing.js           # Marketplace excess stock
│   └── ...                  # Product, Inventory, Stockout schemas
├── routes/
│   ├── auth.js              # Signup, login, JWT token management
│   ├── stores.js            # Store CRUD operations
│   ├── sales.js             # Record sales, analytics
│   ├── requests.js          # 3-tier fulfillment engine
│   ├── search.js            # Cross-store item search
│   ├── listings.js          # Community marketplace
│   ├── votes.js             # Community voting
│   ├── dashboard.js         # DCCK analytics aggregation
│   ├── demand.js            # Demand scoring (requests + votes)
│   └── items.js             # Item browsing & categories
├── public/
│   ├── index.html           # Landing page
│   ├── login.html           # Authentication portal
│   ├── customer.html        # Marketplace + cart + checkout
│   ├── chatbot.html         # AI assistant (Gemini-powered)
│   ├── tablet.html          # Store owner management
│   ├── dashboard.html       # DCCK analytics dashboard
│   ├── community.html       # Community voting board
│   ├── display.html         # In-store inventory display
│   ├── css/style.css        # Dark theme design system
│   └── js/
│       ├── auth.js          # JWT auth, nav injection, AI widget
│       ├── customer.js      # Search, cart, checkout, payments
│       ├── tablet.js        # Sales, inventory, analytics
│       ├── dashboard.js     # Charts, demand signals
│       ├── community.js     # Voting, marketplace
│       └── display.js       # Auto-refresh inventory display
└── package.json
```

---

## API Reference

### Authentication
| Method | Endpoint | Description |
|:---|:---|:---|
| `POST` | `/api/auth/signup` | Create new account (customer/owner) |
| `POST` | `/api/auth/login` | Login, receive JWT token |
| `GET` | `/api/auth/me` | Get current user profile |

### Stores & Inventory
| Method | Endpoint | Description |
|:---|:---|:---|
| `GET` | `/api/stores` | List all stores with inventory |
| `GET` | `/api/stores/:id/display` | Store inventory for display |
| `GET` | `/api/search?q=&ward=` | Search items across stores |
| `GET` | `/api/items` | Browse all items by category |
| `GET` | `/api/lowstock/:storeId` | Low stock alerts |

### Sales & Analytics
| Method | Endpoint | Description |
|:---|:---|:---|
| `POST` | `/api/sales` | Record a sale (decrements stock) |
| `GET` | `/api/sales/:storeId?days=` | Sales history with analytics |
| `GET` | `/api/dashboard` | DCCK network-wide analytics |

### Fulfillment & Demand
| Method | Endpoint | Description |
|:---|:---|:---|
| `POST` | `/api/requests` | Submit request (3-tier fulfillment) |
| `GET` | `/api/requests` | Recent requests |
| `PATCH` | `/api/requests/:id/status` | Update request status |
| `POST` | `/api/votes` | Vote for an item in a ward |
| `GET` | `/api/votes?ward=` | Get vote tallies |
| `GET` | `/api/demand` | Demand signals (requests + votes) |

### Community & AI
| Method | Endpoint | Description |
|:---|:---|:---|
| `POST` | `/api/listings` | List excess stock on marketplace |
| `GET` | `/api/listings` | Browse marketplace listings |
| `POST` | `/api/chat` | AI chatbot (Gemini-powered) |

---

## Pages

| Route | Purpose | Access |
|:---|:---|:---|
| `/` | Landing page | Public |
| `/login` | Sign in / Sign up | Public |
| `/customer` | Search, browse, cart, checkout | Customers |
| `/chatbot` | AI assistant for queries & management | All logged-in users |
| `/tablet` | Record sales, manage inventory | Store Owners |
| `/dashboard` | Network analytics, demand signals | DCCK / Owners |
| `/community` | Vote for items, browse marketplace | All logged-in users |
| `/display?store=ID` | Full-screen inventory board | In-Store TV |

---

## How It Works

```
1. DISCOVER                2. FULFILL                  3. FEEDBACK
   Customer searches          3-tier engine kicks in      Community votes +
   or asks AI chatbot         Pickup / Transfer / DCCK    requests create
                                                          demand signals
        |                          |                          |
        v                          v                          v
   +-----------+           +--------------+          +----------------+
   | Find Food |  -------> | Smart Cart   | -------> | DCCK Dashboard |
   | AI Chat   |           | Transfer Fee |          | Demand Scoring |
   | Community |           | Healthy Deal |          | Bulk Orders    |
   +-----------+           +--------------+          +----------------+
        ^                          |                          |
        |                          v                          v
        +------- Coupon codes, order tracking, restock recommendations
```

1. **Customer searches** for an item on `/customer` or asks the AI on `/chatbot`
2. **StockWise checks all stores** across DC wards in real-time
3. **3-tier fulfillment** activates:
   - **Pickup** -- item is in a same-ward store, reserved immediately
   - **Transfer** -- item exists in another ward, transferred with shared economics
   - **DCCK Delivery** -- nobody has it, added to DCCK's next delivery cycle
4. **Smart cart** calculates transfer fees, healthy discounts, and coupon rewards
5. **Checkout** supports Card, SNAP/EBT, and Cash at Pickup
6. **Community votes** aggregate with request data to create **demand signals**
7. **DCCK dashboard** uses demand signals to prioritize bulk orders
8. **Store owners** track sales, SNAP usage, and list excess stock before expiry
9. **AI assistant** provides natural language access to all data with action buttons

---

## Built For

<div align="center">

**George Hacks 2026 -- Corner Store of the Future**

DC Central Kitchen (DCCK) Healthy Corners Program challenge to leverage technology for improving fresh food access in DC's food deserts.

*Empowering communities, one corner store at a time.*

</div>

---

## Team

Built with care by the **StockWise** team at George Hacks 2026.

---

<div align="center">

<sub>Made with Node.js, MongoDB, and Gemini AI</sub>

</div>
