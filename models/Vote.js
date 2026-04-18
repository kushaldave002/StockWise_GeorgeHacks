const mongoose = require('mongoose');

const voteSchema = new mongoose.Schema({
  item: String,
  ward: Number,
  count: { type: Number, default: 1 },
  voters: [String]
});

module.exports = mongoose.model('Vote', voteSchema);
