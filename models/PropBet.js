const mongoose = require('mongoose');

const propBetSchema  = new mongoose.Schema({
  sport: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Sport',
    required: true
  },
  name: {
    type: String,
    required: true
  },
  description: String,
});

module.exports = mongoose.model('propBet', propBetSchema);
