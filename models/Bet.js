const mongoose = require('mongoose');

const BetSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    require: true
  },
  entryFee: {
    type: Number,
    require: true
  },
  prize: {
    type: Number,
    default: 0
  },
  betType: {
    type: String,
    enum: ['low', 'high'],
    require: true
  },
  picks: [{
    playerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Player',
      require: true
    },
    contest: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Contest',
      require: true
    },
    prop: {
      propName: {
        type: String,
        require: true
      },
      odds: {
        type: Number,
        require: true
      }
    },
    overUnder: {
      type: String,
      enum: ['over', 'under'],
      require: true
    },
  }],
  status: {
    type: String,
    enum: ['pending', 'win', 'lost'],
    default: 'pending'
  }
});

module.exports = mongoose.model('bet', BetSchema);
