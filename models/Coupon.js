const mongoose = require('mongoose');

const couponSchema = new mongoose.Schema({
  customerName: String,
  code: String,
  amount: { type: Number, default: 5 },
  type: { type: String, enum: ['snap', 'transfer'], default: 'snap' },
  request: { type: mongoose.Schema.Types.ObjectId, ref: 'Request' },
  store: { type: mongoose.Schema.Types.ObjectId, ref: 'Store' },
  used: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Coupon', couponSchema);
