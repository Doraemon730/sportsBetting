const mongoose = require('mongoose');

const ContestSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },

  remoteId: {
    type: String,
    required: true
  },
  season: {
    type: String

  },
  startTime: {
    type: Date,
    required: true
  },
  endTime: {
    type: Date
  },
  sportId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'sport',
    required: true
  },

  teams: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'team'
    }
  ],

  participants: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'bet'
  }
  ]
});

module.exports = mongoose.model('contest', ContestSchema);
