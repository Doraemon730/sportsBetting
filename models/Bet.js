const mongoose = require('mongoose');

const BetSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  entryFee: {
    type: Number,
    required: true
  },
  prize: {
    type: Number,
    default: 0
  },
  betType: {
    type: String,
    enum: ['low', 'high'],
    required: true
  },
  picks: [{
    playerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Player',
      required: true
    },
    contestId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Contest',
      required: true
    },
    prop: {
      propName: {
        type: String,
        required: true
      },
      odds: {
        type: Number,
        required: true
      }
    },
    overUnder: {
      type: String,
      enum: ['over', 'under'],
      required: true
    },
  }],
  status: {
    type: String,
    enum: ['pending', 'win', 'lost'],
    default: 'pending'
  }
});

module.exports = mongoose.model('bet', BetSchema);
