const mongoose = require('mongoose');

const couponSchema = new mongoose.Schema({
  customerName: String,
  amount: { type: Number, default: 5 },
  used: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Coupon', couponSchema);
