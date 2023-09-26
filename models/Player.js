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
  remoteId: {
    type: String,
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
  teamName:{
    type: String
  },
  odds:[
    {
      id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Prop'
      },
      value: {
        type: Number
      },
      event:{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Event'
      }
    }
  ]
});

module.exports = mongoose.model('player', PlayerSchema);
