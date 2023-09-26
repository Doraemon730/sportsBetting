const mongoose = require('mongoose');

const ConfigureSchema = new mongoose.Schema({
    minBetAmount: {
        type: Number,
        required: true
    },
    maxBetAmount: {
        type: Number,
        required: true
    }
}, { timestamps: true });

module.exports = mongoose.model('configure', ConfigureSchema);
