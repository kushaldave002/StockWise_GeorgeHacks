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
  timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Request', requestSchema);
