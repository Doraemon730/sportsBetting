const mongoose = require('mongoose');

const PlayerSchema = new mongoose.Schema({
  sportId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Sport',
    required: true
  },
  teamId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Team'
  },
  name: {
    type: String,
    required: true
  },
  position: String,
  age: Number,
  statistics: {
    points: Number,
    assists: Number,
    rebounds: Number
  }
});

module.exports = mongoose.model('player', PlayerSchema);
