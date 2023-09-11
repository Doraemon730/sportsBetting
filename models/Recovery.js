const mongoose = require('mongoose');

const RecoverySchema = new mongoose.Schema({
    email: {
        type: String,
        required: true
    },
    emailHash: {
        type: String,
        required: true
    }
});

module.exports = mongoose.model('recovery', RecoverySchema);
