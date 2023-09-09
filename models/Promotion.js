const mongoose = require('mongoose');

const PromotionSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,        
    },
    description: {
        type: String,
    },
    approach: {
        type: Number,
    }
});

module.exports = mongoose.model('Promotion', PromotionSchema);