const mongoose = require('mongoose');

const BonusSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'user',
        required: true
    },
    invitedUserId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'user',
        required: true
    },
    date: {
        type: Date,
        required: true
    },
    amountWagered: {
        type: Number,
        default: 0
    },
    commission: {
        type: Number,
        default: 0
    }
});

module.exports = mongoose.model('bonus', BonusSchema);
