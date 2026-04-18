const mongoose = require('mongoose');

const saleSchema = new mongoose.Schema({
  store: { type: mongoose.Schema.Types.ObjectId, ref: 'Store' },
  item: String,
  qty: Number,
  price: Number,
  isSnap: Boolean,
  date: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Sale', saleSchema);
