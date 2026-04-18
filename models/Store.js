const mongoose = require('mongoose');

const storeSchema = new mongoose.Schema({
  name: String,
  address: String,
  ward: Number,
  inventory: [{
    item: String,
    qty: Number,
    price: Number,
    category: String
  }],
  lat: Number,
  lng: Number
});

module.exports = mongoose.model('Store', storeSchema);
