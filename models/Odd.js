const mongoose = require('mongoose')


const OddSchema = new mongoose.Schema({
    sportEvent: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Event' 
    },
                       
    
    
}, { timestamps: true });    


module.exports = mongoose.model('odd', OddSchema);