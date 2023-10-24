const mongoose = require('mongoose')

const DiscountSchema = new mongoose.Schema({
    playerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'player',
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
        ref: 'props',
        required: true,
    },
    propName: {
        type: String,
        required: true,
    },
    users: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'user',
        }
    ]
}, {
    timestamps: {
        createdAt: true,
        updatedAt: true
    }
});

module.exports = mongoose.model('discount', DiscountSchema);