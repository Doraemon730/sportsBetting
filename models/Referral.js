const mongoose = require('mongoose');

const ReferralSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'user',
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
    commission: {
        type: Number,
        default: 0.5
    },
    invitesList: [{
        invitedUserId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'player'
        },
        betAmount: {
            type: Number,
            default: 0
        }
    }],
});

module.exports = mongoose.model('referral', ReferralSchema);
