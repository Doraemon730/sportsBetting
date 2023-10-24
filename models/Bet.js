const mongoose = require('mongoose');

const BetSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'user',
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
  credit: {
    type: Number,
    default: 0,
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
      ref: 'player',
      required: true
    },
    remoteId: {
      type: String,
      required: true,
    },
    contestId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'event',
      required: true
    },
    teamId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'team',
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
    result: {
      type: Number
    },
    liveData: {
      type: Number,
      default: 0
    }
  }],
  status: {
    type: String,
    enum: ['pending', 'win', 'lost', 'refund', 'canceled'],
    default: 'pending'
  },
  promotion: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'promotion',
    default: function () {
      return new mongoose.Types.ObjectId('64fbe8cd009753bb7aa7a4fb');
    }
  },
  parlay: {
    type: Boolean,
    default: false
  },
  parlayIndex: {
    type: Number,
    default: 0
  }
},
  {
    timestamps: {
      createdAt: true,
      updatedAt: true
    }
  });

module.exports = mongoose.model('bet', BetSchema);
