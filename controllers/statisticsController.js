const Statistics = require('../models/Statistics');
const Bet = require('../models/Bet');
const User = require('../models/User');
const updateTotal = async () => {
    try {
        const now = new Date();
        now.setUTCHours(0, 0, 0, 0);
        const statistic = await Statistics.findOne({}, {}, {
            sort: {
                _id: -1
            }
        });
        if (now.getDate() === statistic.date.getDate()) {
            statistic.total_users++;
            statistic.daily_users++;
            await statistic.save();
        } else {
            const newstatistic = new Statistics({
                date: now,
                total_users: statistic.total_users + 1,
                daily_users: 1,
                total_bet_amount: statistic.total_bet_amount,
                total_bet_users: statistic.total_bet_users,                
            });
            await newstatistic.save();
        }

    } catch (error) {
        console.log(error.message);
    }
}
const updateBetWithNew = async (amount) => {
    try {
        const now = new Date();
        now.setUTCHours(0, 0, 0, 0);
        const statistic = await Statistics.findOne({}, {}, {
            sort: {
                _id: -1
            }
        });
        if (now.getDate() === statistic.date.getDate()) {
            
            statistic.daily_bet_users++;
            statistic.total_bet_users++;            
            statistic.total_bet_amount += amount;
            statistic.daily_bet_amount += amount;
            await statistic.save();
        } else {
            const newstatistic = new Statistics({
                date: now,
                total_bet_users: statistic.total_bet_users + 1,                                
                total_bet_amount: statistic.total_bet_amount + amount,
                daily_bet_users: 1,
                daily_bet_amount: amount,
            });
            await newstatistic.save();
        }
    } catch (error) {
        console.log(error.message);
    }
}

const updateBetWithDaily = async (isFirst, amount) => {
    try {
        const now = new Date();
        now.setUTCHours(0, 0, 0, 0);
        const statistic = await Statistics.findOne({}, {}, {
            sort: {
                _id: -1
            }
        });
        if (now.getDate() === statistic.date.getDate()) {
            if(isFirst)
                statistic.daily_bet_users++;            
            statistic.total_bet_amount += amount;
            statistic.daily_bet_amount += amount;
            await statistic.save();
        } else {
            const newstatistic = new Statistics({
                date: now,                
                total_bet_amount: statistic.total_bet_amount + amount,
                daily_bet_users: 1,
                daily_bet_amount: amount,
            });
            await newstatistic.save();
        }
    } catch (error) {
        console.log(error.message);
    }
}
const getStatisticsByDate = async (date) => {
    try {
        date.setUTCHours(0, 0, 0, 0);        
        console.log(date);
        const statistics = await Statistics.findOne({
            date: date
        });
        return statistics;
    } catch (error) {
        console.log(error.message);
    }
}

const getStatistics = async (req, res) => {
    try {        
        let {
            date
        } = req.body;
        if (!date)
            date = new Date();        
        const statistics = await getStatisticsByDate(date);
        res.json(statistics);
    } catch (error) {
        console.log(error.message);
        res.status(500).json(error.message);
    }
}

const getTotalUserWithBet = async (req, res) => {
    try {        
        const userBetStats = await Bet.aggregate([
            {
              $group: {
                _id: '$userId',
                totalBets: { $sum: 1 },
                totalEntryFee: { $sum: '$entryFee' },
                totalPrize: { $sum: '$prize' }
              }
            }
          ]);      
          const userBetStatsWithUserDetails = await User.populate(userBetStats, { path: '_id', select: 'firstName lastName' });
          res.json(userBetStatsWithUserDetails);      
    } catch (error) {
        console.log(error.message);
        res.status(500).json(error.message);
    }
}

const getUserBetStats = async (req, res) => {
    try {
        const { date } = req.body;
        const userBetStats = await Bet.aggregate([
            {
              $match: {
                createdAt: {
                  $gte: new Date(date), // Filter bets created on or after the specified date
                  $lt: new Date(date + 'T23:59:59.999Z') // Filter bets created before the next day
                }
              }
            },
            {
              $group: {
                _id: '$userId',
                totalBets: { $sum: 1 },
                totalEntryFee: { $sum: '$entryFee' },
                totalPrize: { $sum: '$prize' }
              }
            }
          ]);
      
          const userBetStatsWithUserDetails = await User.populate(userBetStats, { path: '_id', select: 'firstName lastName' });
          res.json(userBetStatsWithUserDetails);

    } catch (error) {
        console.log(error.message);
        res.status(500).json(error.message);
    }
}

module.exports = {
    getStatistics,
    updateTotal,
    updateBetWithDaily,
    updateBetWithNew,
    getTotalUserWithBet,
    getUserBetStats
}