const mongoose = require('mongoose');

const TeamSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  sportId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'sport',
    required: true
  },
  remoteId: {
    type: String,
    required: true
  },
  alias: {
    type: String,
  },
  srId: {
    type: String,
  },
  market: {
    type: String
  }
});

module.exports = mongoose.model('team', TeamSchema);
