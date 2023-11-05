
const mongoose = require('mongoose');

const VerificationSchema = new mongoose.Schema({
    userId: { 
        type: mongoose.Schema.Types.ObjectId,
        ref: 'sport',
        required: true
    },
    email: {
        type: String,
        required: true
    },
    verifyCode: {
        type: String,
        required: true
    },
    expiredAt: {
        type: Date,
        required: true
    },
    verified: {
        type: Boolean,
        default: false
    }
}, {timestamps: true});

module.exports = mongoose.model('verification', VerificationSchema);
