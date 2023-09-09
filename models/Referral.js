const mongoose = require('mongoose');

const ReferralSchema = new mongoose.Schema({
    userid: {
        type: String,
        required: true
    },
    referralcode: {
        type: Number,
        required: true
    },
    invitesList: [{
        type: mongoose.Schema.Types.ObjectId,
    }],
});

module.exports = mongoose.model('referral', ReferralSchema);
