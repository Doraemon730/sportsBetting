const mongoose = require('mongoose');

const StatisticSchema = new mongoose.Schema({
    date: {
        type: Date,
        default: Date()
    },
    total_users: {
        type: Number,
        default: 0
    },
    daily_users: {
        type: Number,
        default: 0
    },
    total_bets: {
        type: Number,
        default: 0
    },
    total_bet_users: {
        type: Number,
        default: 0
    },
    total_bet_amount: {
        type: Number,
        default: 0
    },
    daily_bets: {
        type: Number,
        default: 0
    },
    daily_bet_users: {
        type: Number,
        default: 0
    },
    daily_bet_amount: {
        type: Number,
        default: 0
    },
    daily_wins: {
        type: Number,
        default: 0
    },
    daily_loss: {
        type: Number,
        default: 0
    }

});

module.exports = mongoose.model('statistic', StatisticSchema)
