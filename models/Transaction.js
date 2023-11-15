const mongoose = require('mongoose');

const TransactionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'user',
    required: true
  },
  hashTransaction: {
    type: String,
  },
  transactionType: {
    type: String,
    enum: ['deposit', 'withdraw', 'bet', 'prize', 'refund'],
    required: true
  },
  amountETH: {
    type: Number,
    required: true
  },
  amountUSD: {
    type: Number,
    required: true
  }
},
  {
    timestamps: {
      createdAt: true,
      updatedAt: false
    }
  });

module.exports = mongoose.model('transaction', TransactionSchema);
