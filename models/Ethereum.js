const mongoose = require('mongoose');

const EthereumSchema = new mongoose.Schema({
    price: {
        type: Number,
        required: true
    }
});

module.exports = mongoose.model('ethereum', EthereumSchema);
