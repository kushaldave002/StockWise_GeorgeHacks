require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const { MongoMemoryServer } = require('mongodb-memory-server');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// API routes
app.use('/api/stores', require('./routes/stores'));
app.use('/api/sales', require('./routes/sales'));
app.use('/api/requests', require('./routes/requests'));
app.use('/api/listings', require('./routes/listings'));
app.use('/api/search', require('./routes/search'));
app.use('/api/votes', require('./routes/votes'));
app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/api/demand', require('./routes/demand'));

// Clean URLs — /customer serves customer.html
app.get('/:page', (req, res, next) => {
  const filePath = path.join(__dirname, 'public', req.params.page + '.html');
  res.sendFile(filePath, err => { if (err) next(); });
});

const PORT = process.env.PORT || 3000;

async function start() {
  let uri = process.env.MONGODB_URI;

  // Use in-memory MongoDB if no external URI or local MongoDB
  if (!uri || uri.includes('localhost')) {
    try {
      await mongoose.connect(uri);
    } catch {
      console.log('Local MongoDB not found, starting in-memory server...');
      const mongod = await MongoMemoryServer.create();
      uri = mongod.getUri();
    }
  }

  if (mongoose.connection.readyState !== 1) {
    await mongoose.connect(uri);
  }
  console.log('Connected to MongoDB');

  // Auto-seed if database is empty
  const Store = require('./models/Store');
  const count = await Store.countDocuments();
  if (count === 0) {
    console.log('Database empty, running seed...');
    require('./seed-data')();
  }

  app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
}

start().catch(err => {
  console.error('Startup error:', err.message);
  process.exit(1);
});
