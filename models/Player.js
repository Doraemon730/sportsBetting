const mongoose = require('mongoose');

const PlayerSchema = new mongoose.Schema({
  sportId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'sport',
    required: true
  },
  teamId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'team'
  },
  remoteId: {
    type: String,
    required: true
  },
  name: {
    type: String,
    required: true
  },
  position: String,
  age: Number,
  jerseyNumber: Number,
  srId: {
    type: String
  },
  headshot: {
    type: String
  },
  odds: [
    {
      id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'prop'
      },
      value: {
        type: Number
      },
      event: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'event'
      }
    }
  ]
});

module.exports = mongoose.model('player', PlayerSchema);
