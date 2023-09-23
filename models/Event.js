const mongoose = require('mongoose')


const EventSchema = new mongoose.Schema({
    id : {
        type: String,
        index: true        
    },
    startTime: {
        type: Date,
        requried: true,
    },
    name: {
        type:String,
        required: true
    },
    competitors:[{
        id: { type: String },
        name: { type: String },
        country: { type: String },
        country_code: { type: String },
        abbreviation: { type: String },
        rotation_number: { type: String },
        teamId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Team'
        }
    }],
    participants: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Bet'
    }],
    state: {
        type: Number,
        default: 0 // 0 - not started; 1- in progress ;2 finished
    }    
    
}, { timestamps: true });    


module.exports = mongoose.model('event', EventSchema);