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
    type:String

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
    ref: 'Sport',
    required: true
  },

  teams: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Team'
    }
  ],

  participants: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
  ]
});

module.exports = mongoose.model('contest', ContestSchema);
