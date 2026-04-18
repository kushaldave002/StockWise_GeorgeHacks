const mongoose = require('mongoose');

const listingSchema = new mongoose.Schema({
  store: { type: mongoose.Schema.Types.ObjectId, ref: 'Store' },
  item: String,
  qty: Number,
  price: Number,
  expiry: Date,
  claimed: { type: Boolean, default: false },
  listedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Listing', listingSchema);
