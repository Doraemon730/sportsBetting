const mongoose = require('mongoose');

const SportSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  icon: String,
  description: String,
});

module.exports = mongoose.model('sport', SportSchema);
