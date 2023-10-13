const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  firstName: {
    type: String,
    required: true
  },
  lastName: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true,
    unique: true
  },
  password: {
    type: String,
    required: true
  },
  date: {
    type: Date,
    default: Date.now
  },
  ETH_balance: {
    type: Number,
    default: 0
  },
  credits: {
    type: Number,
    default: 0
  },
  referralCode: {
    type: String
  },
  myReferralCode: {
    type: String,
    required: true
  },
  isAdmin: {
    type: Boolean,
    default: false
  },
  level: {
    type: String,
    default: ""
  },
  firstDepositAmount: {
    type: Number,
    default: 0
  },
  wins: {
    type: Number,
    default: 0
  },
  totalBetAmount: {
    type: Number,
    default: 0
  },
  walletAddress: {
    type: String
  },
  privateKey: {
    type: String
  },
  promotion: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'promotion',
    default: function () {
      return new mongoose.Types.ObjectId('64fbe8cd009753bb7aa7a4fb');
    }
  },
  lastlogin: {
    type: Date
  },
  freeSix: {
    type: Number,
    default: 0
  },
  isPending: {
    type: Boolean,
    default: false
  },
  userIP: {
    type: String
  },
  weeklyRewards: {
    amount: {
      type: Number,
      default: 0
    },
    receiveDate: {
      type: Date
    }
  }
});

module.exports = mongoose.model('user', UserSchema);
