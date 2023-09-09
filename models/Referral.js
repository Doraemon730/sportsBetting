const mongoose = require('mongoose');

const ReferralSchema = new mongoose.Schema({
    userId: {
        type: String,
        required: true
    },
    referralcode: {
        type: String,
        required: true
    },
    invitesList: [{
        type: mongoose.Schema.Types.ObjectId,
    }],
});

module.exports = mongoose.model('referral', ReferralSchema);
