const mongoose = require('mongoose');

const PlayerStatSchema = new mongoose.Schema({
  playerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'player',
    required: true
  },
  stats: [
    {
      gameName: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'props'
      },
      date: {
        type: Date,
      },
      props: [
        {
          propName: {
            type: String
          },
          value: {
            type: Number
          }
        }
      ]
    }
  ]
});

module.exports = mongoose.model('playerStat', PlayerStatSchema);
