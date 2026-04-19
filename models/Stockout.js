const mongoose = require('mongoose');

// Matches our 'stockouts' collection
const stockoutSchema = new mongoose.Schema({
  storeId: { type: mongoose.Schema.Types.ObjectId, ref: 'CornerStore' },
  storeCode: String,
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
  productSku: String,
  productName: String,
  category: String,
  occurredAt: Date,
  detectedAt: Date,
  resolvedAt: Date,
  daysOutOfStock: Number,
  resolutionType: {
    type: String,
    enum: ['restocked', 'substitute_offered', 'customer_referred', 'pending']
  },
  unfulfilledDemand: {
    estimatedUnits: Number,
    estimatedRevenue: Number,
    customerRequests: Number
  },
  impact: {
    customerImpactScore: Number,
    lostRevenue: Number,
    daysOutOfStock: Number
  },
  notes: String,
  createdAt: Date,
  updatedAt: Date
}, { collection: 'stockouts' });

module.exports = mongoose.model('Stockout', stockoutSchema);
