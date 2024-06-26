const mongoose = require('mongoose');

const EthereumSchema = new mongoose.Schema({
    price: {
        type: Number,
        required: true
    }
}, {timestamps:true});

module.exports = mongoose.model('ethereum', EthereumSchema);
