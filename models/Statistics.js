const mongoose = require('mongoose');

const StatisticSchema = new mongoose.Schema({
    date: {
        type : Date,
        default:Date()
    },
    total_users:{
        type:Number ,
        default:0
    },
    daily_users: {
        type: Number,
        default: 0
    }
});

module.exports = mongoose.model('statistic', StatisticSchema)
