const mongoose = require('mongoose');

const storeSchema = new mongoose.Schema({
  name: String,
  address: String,
  ward: Number,
  lat: Number,
  lng: Number,
  characteristics: {
    acceptsSNAP: { type: Boolean, default: false },
    acceptsWIC: { type: Boolean, default: false },
    hasRefrigeration: { type: Boolean, default: true }
  },
  inventory: [{
    item: String,
    qty: Number,
    price: Number,
    category: String
  }]
});

module.exports = mongoose.model('Store', storeSchema);
