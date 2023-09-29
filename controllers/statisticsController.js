const Statistics = require('../models/Statistics');
const Bet = require('../models/Bet');
const User = require('../models/User');
require('../utils/log');
const updateTotal = async () => {
    try {
        const now = new Date();
        now.setUTCHours(0, 0, 0, 0);
        const statistic = await Statistics.findOne({}, {}, {
            sort: {
                _id: -1
            }
        });

        if (!statistic) {
            const newstatistic = new Statistics({
                date: now,
                total_users: 1,
                daily_users: 1
            });
            await newstatistic.save();
        }
        else {
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
        }

    } catch (error) {
        console.log(error);
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
        if (statistic && now.getDate() === statistic.date.getDate()) {
            statistic.daily_bets++;
            statistic.daily_bet_users++;
            statistic.total_bets++;
            statistic.total_bet_users++;
            statistic.total_bet_amount += amount;
            statistic.daily_bet_amount += amount;
            await statistic.save();
        } else {
            let total_bets = 1;
            let total_bet_users = 1;
            let total_bet_amount = amount;
            if (statistic) {
                total_bets = statistic.total_bets + 1;
                total_bet_users = statistic.total_bet_users + 1;
                total_bet_amount = statistic.total_bet_amount + amount
            }
            const newstatistic = new Statistics({
                date: now,
                total_bets,
                total_bet_users,
                total_bet_amount,
                daily_bets: 1,
                daily_bet_users: 1,
                daily_bet_amount: amount,
            });
            await newstatistic.save();
        }
    } catch (error) {
        console.log(error);
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
        if (statistic && now.getDate() === statistic.date.getDate()) {
            if (isFirst)
                statistic.daily_bet_users++;
            statistic.total_bets += 1;
            statistic.daily_bets += 1;
            statistic.total_bet_amount += amount;
            statistic.daily_bet_amount += amount;
            await statistic.save();
        } else {
            const newstatistic = new Statistics({
                date: now,
                total_bets: statistic.total_bets + 1,
                total_bet_amount: statistic.total_bet_amount + amount,
                daily_bet_users: 1,
                daily_bets: 1,
                daily_bet_amount: amount,
            });
            await newstatistic.save();
        }
    } catch (error) {
        console.log(error);
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
        console.log(error);
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
        res.status(500).send('Server error');
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
                    totalPrize: { $sum: '$prize' },
                    totalWins: {
                        $sum: {
                            $cond: [{ $eq: ['$status', 'win'] }, 1, 0]
                        }
                    }
                }
            }
        ]);
        const userBetStatsWithUserDetails = await User.populate(userBetStats, { path: '_id', select: 'firstName lastName credits ETH_balance' });
        res.json(userBetStatsWithUserDetails);
    } catch (error) {
        res.status(500).send('Server error');
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
        res.status(500).send('Server error');
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