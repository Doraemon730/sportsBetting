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
  password: {
    type: String
  },
  date: {
    type: Date,
    default: Date.now
  },
  balance: {
    type: Number,
    default: 0
  },
  referralCode: {
    type: String
  }
});

module.exports = mongoose.model('user', UserSchema);
