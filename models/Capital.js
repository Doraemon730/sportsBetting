const mongoose = require('mongoose')


const CapitalSchema = new mongoose.Schema({
    total: {
        type : Number,
        default : 0
    },
    deposit: {
        type: Number,
        default: 0,
    },
    withdraw: {
        type: Number,
        default: 0,
    },
    profit: {
        type: Number,
        default: 0,
    },
    lost: {
        type: Number,
        default: 0,
    }    
    }, { timestamps: true });
    


module.exports = mongoose.model('capital', CapitalSchema);