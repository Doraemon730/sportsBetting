const mongoose = require('mongoose');

const PropSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  sportId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'sport',
    required: true
  },
  displayName: {
    type: String,
  },
  srId: {
    type: String,
    required: true
  },
  available: {
    type: Boolean,
    default: true
  }
});

module.exports = mongoose.model('props', PropSchema);
