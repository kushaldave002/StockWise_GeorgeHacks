const mongoose = require('mongoose');

// Matches our 'inventory' collection
const inventorySchema = new mongoose.Schema({
  storeId: { type: mongoose.Schema.Types.ObjectId, ref: 'CornerStore' },
  storeCode: String,
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
  productSku: String,
  productName: String,
  category: String,
  currentStock: Number,
  reservedStock: Number,
  status: {
    type: String,
    enum: ['in_stock', 'low_stock', 'out_of_stock']
  },
  thresholds: {
    minStock: Number,
    reorderPoint: Number,
    reorderQty: Number,
    maxStock: Number
  },
  metrics: {
    avgDailyDemand: Number,
    daysUntilStockout: Number,
    turnoverRate: Number
  },
  lastStockUpdate: Date,
  lastSaleAt: Date,
  createdAt: Date,
  updatedAt: Date
}, { collection: 'inventory' });

module.exports = mongoose.model('Inventory', inventorySchema);
