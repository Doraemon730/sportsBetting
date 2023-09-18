const mongoose = require('mongoose');

const ReferralSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    referralCode: {
        type: String,
        required: true
    },
    level: {
        type: Number,
        default: 1
    },
    invitesList: [{
        invitedUserId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Player'
        },
        betAmount: {
            type: Number,
            default: 0
        }
    }],
});

module.exports = mongoose.model('referral', ReferralSchema);
