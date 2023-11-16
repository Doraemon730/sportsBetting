const mongoose = require('mongoose')

const SPlayerSchema = new mongoose.Schema({
    sportId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'sport',
        required: true
    },
    name : {
        type: String,
        required: true
    },
    position: String,
    gId: String,
    headshot: String,
    nickName: String,
    odds: [
        {
          id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'props'
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
}, {timestamps: true});

module.exports = mongoose.model('splayer', SPlayerSchema);