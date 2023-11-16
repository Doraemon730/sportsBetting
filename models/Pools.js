const mongoose = require('mongoose')


const PoolsSchema = new mongoose.Schema({
    ISOweek: {
      type: String,
      required: true
    },
    sportId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'sport'
    },
    startTime: {
        type: Date,
        requried: true,
    },
    participants: [{
        poolbetId: {type: mongoose.Schema.Types.ObjectId,
            ref: 'poolbets'}
    }],
    state: {
        type: Number,
        default: 0 // 0 - not started; 1- in progress ;2 finished (not checked); 3 checked
    },
    prizepool: {
        type: Number,
        default: 0
    },
    topwins: {
        type: Number,
        default: 0
    },
    winners: [{
        poolbetId: {type: mongoose.Schema.Types.ObjectId,
            ref: 'poolbets'}
    }],

}, { timestamps: true });


module.exports = mongoose.model('pools', PoolsSchema);