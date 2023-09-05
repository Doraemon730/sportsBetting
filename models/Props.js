const mongoose = require('mongoose');

const PropsSchema = new mongoose.Schema({
  name: [{
    type: String,
    required: true
  }],
  sportId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Sport',
    required: true
  }
});

module.exports = mongoose.model('props', PropsSchema);
