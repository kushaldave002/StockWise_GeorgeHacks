const mongoose = require('mongoose');

// Matches our 'products' collection
const productSchema = new mongoose.Schema({
  sku: String,
  name: String,
  description: String,
  category: {
    primary: String,
    subcategory: String,
    tags: [String]
  },
  attributes: {
    brand: String,
    size: String,
    unit: String,
    isPerishable: Boolean,
    requiresRefrigeration: Boolean,
    shelfLifeDays: Number
  },
  pricing: {
    basePrice: Number,
    costPrice: Number,
    currency: String,
    isSNAPEligible: Boolean
  },
  popularityScore: Number,
  supplier: {
    name: String,
    leadTimeDays: Number,
    minOrderQty: Number
  },
  isActive: Boolean,
  createdAt: Date
}, { collection: 'products' });

module.exports = mongoose.model('Product', productSchema);
