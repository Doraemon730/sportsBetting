const mongoose = require('mongoose');

const PoolBetSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'user',
    required: true
  },
  serverFeeETH: {
    type: Number,
    required: true
  },
  entryFeeETH: {
    type: Number,
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
  wins: { //amount of won bets
    type: Number,
    default: 0
  },
  events: [{
      event: { type: mongoose.Schema.Types.ObjectId, ref: 'Event' },
      result: { type: Number, enum: [-100, -1, 0, 1], required: true },
      isSkipped: { type: Boolean, default: false },
      betResult: { type: Number, enum: [-100, -1, 0, 1], default: -100, required: true },
  }],
  status: {
    type: String,
    enum: ['pending', 'win', 'lost', 'refund', 'canceled'],
    default: 'pending'
  },
  willFinishAt: {
    type: Date,
  },
  ISOweek: {
    type: String,
    required: true
  },
  sportId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'sport'
  },
},
  {
    timestamps: {
      createdAt: true,
      updatedAt: true
    }
  });

module.exports = mongoose.model('poolbet', PoolBetSchema);
