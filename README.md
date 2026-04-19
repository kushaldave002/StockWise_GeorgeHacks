# Grocery Chatbot — Final Version (Gemini AI)

AI-powered grocery chatbot using Google Gemini 1.5 Flash.

## Features
- **Customer mode**: Check inventory, find nearest store, suggest alternatives, check prices
- **Store owner mode**: Sales history & 7-day trends, low stock alerts, restock recommendations, place orders
- **Gemini AI**: Natural language understanding powered by Google Gemini 1.5 Flash
- **Order management**: Place and track restocking orders
- **Live low stock banner**: Auto-alerts owner when stock is low

## Quick Start

### 1. Install Node.js
Download from https://nodejs.org (LTS version)

### 2. Install dependencies
```
npm install
```

### 3. Start the server
```
npm start
```

### 4. Open browser
```
http://localhost:3000
```

## Project Structure
```
grocery-chatbot-final/
├── server.js          ← Backend + Gemini AI + all logic
├── package.json       ← Dependencies
├── .env               ← API keys (Gemini key is here)
└── public/
    └── index.html     ← Frontend chat UI
```

## API Endpoints
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/stores | All stores sorted by distance |
| GET | /api/inventory/:storeId | Store inventory |
| GET | /api/lowstock/:storeId | Low stock alerts |
| GET | /api/orders | All placed orders |
| POST | /api/orders | Place a new order |
| POST | /api/chat | Chat with Gemini AI |

## Connecting MongoDB (later)
In `.env`, uncomment:
```
MONGODB_URI=mongodb://localhost:27017/grocery-chatbot
```
Then replace the `db` object in `server.js` with MongoDB queries.
