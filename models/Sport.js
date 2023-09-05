const mongoose = require('mongoose');

const SportSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  description: String,
});

module.exports = mongoose.model('sport', SportSchema);
