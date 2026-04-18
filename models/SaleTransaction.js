const mongoose = require('mongoose');

// Matches our 'sales' collection
const saleTransactionSchema = new mongoose.Schema({
  transactionId: String,
  timestamp: Date,
  dayOfWeek: Number,
  isWeekend: Boolean,
  isHoliday: Boolean,
  quantity: Number,
  unitPrice: Number,
  totalAmount: Number,
  customerType: {
    type: String,
    enum: ['regular', 'family', 'senior', 'student', 'snap_only']
  },
  paymentMethod: {
    type: String,
    enum: ['cash', 'credit', 'debit', 'SNAP', 'WIC', 'mobile']
  },
  metadata: {
    storeId: { type: mongoose.Schema.Types.ObjectId, ref: 'CornerStore' },
    storeCode: String,
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
    productSku: String,
    productName: String,
    category: String
  }
}, { collection: 'sales' });

module.exports = mongoose.model('SaleTransaction', saleTransactionSchema);
