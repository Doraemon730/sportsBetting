const mongoose = require('mongoose');

const PropSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  sportId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Sport',
    required: true
  },
  displayName: {
    type:String,
  },
  available: {
    type: Boolean,
    default: true
  }
});

module.exports = mongoose.model('props', PropSchema);
