const mongoose = require('mongoose');

const ReferralSchema = new mongoose.Schema({
    userId: {
        type: String,
        required: true
    },
    referralCode: {
        type: String,
        required: true
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
