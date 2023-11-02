const mongoose = require('mongoose');

const PromoSchema = new mongoose.Schema({
    entryFee: {
        type: Number,
        required: true
    },
    betType: {
        type: String,
        enum: ['low', 'high'],
        required: true
    },
    payout: [{
        label: {
            type: String
        },
        value: {
            type: Number
        }
    }],
    firstMatchTime: {
        type: Date,
    },
    picks: [{
        playerId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'player',
            required: true
        },
        remoteId: {
            type: String,
        },
        contestId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'event',
            required: true
        },
        teamId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'team',
            required: true
        },
        prop: {
            propName: {
                type: String,
                required: true
            },
            odds: {
                type: Number,
                required: true
            }
        },
        overUnder: {
            type: String,
            enum: ['over', 'under'],
            required: true
        }
    }]
},
    {
        timestamps: {
            createdAt: true,
            updatedAt: true
        }
    });

module.exports = mongoose.model('promo', PromoSchema);
