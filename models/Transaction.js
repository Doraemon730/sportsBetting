const mongoose = require('mongoose');

const TransactionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  hashTransaction: {
    type: String,
  },
  transactionType: {
    type: String,
    enum: ['deposit', 'withdraw', 'bet', 'prize'],
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('transaction', TransactionSchema);