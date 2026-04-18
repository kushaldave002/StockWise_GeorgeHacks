const mongoose = require('mongoose');

// Matches our 'stores' collection
const cornerStoreSchema = new mongoose.Schema({
  code: String,
  name: String,
  address: {
    street: String,
    city: String,
    state: String,
    zipCode: String,
    ward: Number,
    coordinates: {
      lat: Number,
      lng: Number
    }
  },
  contact: {
    ownerName: String,
    email: String,
    phone: String
  },
  hours: {
    monday: { open: String, close: String, isOpen: Boolean },
    tuesday: { open: String, close: String, isOpen: Boolean },
    wednesday: { open: String, close: String, isOpen: Boolean },
    thursday: { open: String, close: String, isOpen: Boolean },
    friday: { open: String, close: String, isOpen: Boolean },
    saturday: { open: String, close: String, isOpen: Boolean },
    sunday: { open: String, close: String, isOpen: Boolean }
  },
  characteristics: {
    acceptsSNAP: Boolean,
    acceptsWIC: Boolean,
    hasRefrigeration: Boolean,
    storeSize: String,
    yearEstablished: Number
  },
  isActive: Boolean,
  createdAt: Date,
  updatedAt: Date
}, { collection: 'stores' });

module.exports = mongoose.model('CornerStore', cornerStoreSchema);
