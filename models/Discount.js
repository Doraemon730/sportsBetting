const mongoose = require('mongoose')

const DiscountSchema = new mongoose.Schema({
    playerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Player',
        required: true
    },
    date: {
        type: Date,
    },
    original: {
        type: Number,
        required: true,
    },
    discount: {
        type: Number,
        required: true,
    },
    propId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Prop',
        required: true,
    }
});

module.exports = mongoose.model('discount', DiscountSchema);