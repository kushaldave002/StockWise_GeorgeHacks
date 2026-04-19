const mongoose = require('mongoose');

const requestSchema = new mongoose.Schema({
  customerName: String,
  item: String,
  ward: Number,
  store: { type: mongoose.Schema.Types.ObjectId, ref: 'Store' },
  matched: { type: Boolean, default: false },
  fulfillment: { type: String, enum: ['pickup', 'transfer', 'dcck', 'none'], default: 'none' },
  sourceStore: { type: mongoose.Schema.Types.ObjectId, ref: 'Store' },
  destinationStore: { type: mongoose.Schema.Types.ObjectId, ref: 'Store' },
  status: { type: String, enum: ['pending', 'reserved', 'in_transit', 'ready', 'completed', 'cancelled'], default: 'pending' },
  estimatedReady: Date,
  // Transfer economics
  originalPrice: Number,
  transferMarkup: Number,       // the extra amount added (15% of original)
  transferPrice: Number,         // originalPrice + transferMarkup
  sourceCommission: Number,      // 10% of original price paid to source store
  couponCode: String,            // coupon code given to customer
  couponAmount: Number,          // equals transferMarkup so customer pays effective original price
  timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Request', requestSchema);
