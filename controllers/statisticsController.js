const Statistics = require('../models/Statistics');
const Capital = require('../models/Capital');
const Bet = require('../models/Bet');
const User = require('../models/User');
require('../utils/log');
const Transaction = require('../models/Transaction');
const { USD2Ether } = require('../utils/util');
const updateTotal = async () => {
    try {
        const now = new Date();
        now.setHours(0, 0, 0, 0);
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
            const totalUsers = await User.countDocuments();
            if (now.getDate() === statistic.date.getDate()) {
                statistic.total_users = totalUsers;
                statistic.daily_users++;
                await statistic.save();
            } else {
                const newstatistic = new Statistics({
                    date: now,
                    total_users: totalUsers,
                    daily_users: 1,
                    total_bet_amount: statistic.total_bet_amount,
                    total_bet_users: statistic.total_bet_users,
                    total_bets: statistic.total_bets,
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
        now.setHours(0, 0, 0, 0);
        const statistic = await Statistics.findOne({}, {}, {
            sort: {
                _id: -1
            }
        });
        if (statistic && now.getDate() === statistic.date.getDate()) {
            statistic.daily_bets++;
            statistic.daily_bet_users++;
            statistic.total_bets++;
            statistic.total_bet_amount += amount;
            statistic.daily_bet_amount += amount;
            await statistic.save();
        } else {
            let total_users = 1;
            let total_bets = 1;
            let total_bet_users = 1;
            let total_bet_amount = amount;
            if (statistic) {
                total_users = statistic.total_users + 1;
                total_bets = statistic.total_bets + 1;
                total_bet_users = statistic.total_bet_users;
                total_bet_amount = statistic.total_bet_amount + amount
            }
            const newstatistic = new Statistics({
                date: now,
                total_users,
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
        now.setHours(0, 0, 0, 0);
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
                total_bet_users: statistic.total_bet_users,
                total_users: statistic.total_users,
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

const updateBetResult = async (isWin) => {
    try {
        const statistic = await Statistics.findOne({}, {}, {
            sort: {
                _id: -1
            }
        });
        if (statistic) {
            if (isWin)
                statistic.daily_wins++;
            if (!isWin)
                statistic.daily_loss++;
            await statistic.save();

        }
    } catch (error) {
        console.log(error.message);
    }
}

const updateTotalUsers = async () => {
    try {
        const now = new Date();
        now.setHours(0, 0, 0, 0);
        const statistic = await Statistics.findOne({}, {}, {
            sort: {
                _id: -1
            }
        });
        if (statistic && now.getDate() === statistic.date.getDate()) {
            statistic.total_bet_users++;
            await statistic.save();
        } else {
            let total_users = 1;
            let total_bets = 1;
            let total_bet_users = 1;
            let total_bet_amount = amount;
            if (statistic) {
                total_users = statistic.total_users;
                total_bets = statistic.total_bets;
                total_bet_users = statistic.total_bet_users + 1;
                total_bet_amount = statistic.total_bet_amount
            }
            const newstatistic = new Statistics({
                date: now,
                total_users,
                total_bets,
                total_bet_users,
                total_bet_amount,
                daily_bets: 0,
                daily_bet_users: 0,
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
        let today = new Date();
        today.setHours(0, 0, 0, 0);

        let yesterday = new Date(Date.now() - 1000 * 60 * 60 * 24);
        yesterday.setHours(0, 0, 0, 0)

        let statistic1 = await Statistics.aggregate([
            {
                $match: {
                    date: { $gt: today }
                }
            },
            {
                $group: {
                    _id: null, // Group all documents into a single group
                    totalUsersSum: { $sum: '$total_users' },
                    dailyUsersSum: { $sum: '$daily_users' }
                }
            }
        ])

        let statistic2 = await Statistics.aggregate([
            {
                $match: {
                    date: { $gt: yesterday }
                }
            },
            {
                $group: {
                    _id: null, // Group all documents into a single group
                    totalUsersSum: { $sum: '$total_users' },
                    dailyUsersSum: { $sum: '$daily_users' }
                }
            }
        ])

        let statistic14 = await Statistics.aggregate([
            {
                $match: {
                    date: { $gt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 14) }
                }
            },
            {
                $group: {
                    _id: null, // Group all documents into a single group
                    totalUsersSum: { $sum: '$total_users' },
                    dailyUsersSum: { $sum: '$daily_users' }
                }
            }
        ])

        let statistic30 = await Statistics.aggregate([
            {
                $match: {
                    date: { $gt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30) }
                }
            },
            {
                $group: {
                    _id: null, // Group all documents into a single group
                    totalUsersSum: { $sum: '$total_users' },
                    dailyUsersSum: { $sum: '$daily_users' }
                }
            }
        ])

        let statistic365 = await Statistics.aggregate([
            {
                $match: {
                    date: { $gt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 365) }
                }
            },
            {
                $group: {
                    _id: null, // Group all documents into a single group
                    totalUsersSum: { $sum: '$total_users' },
                    dailyUsersSum: { $sum: '$daily_users' }
                }
            }
        ])

        let statisticMax = await Statistics.aggregate([
            {
                $group: {
                    _id: null, // Group all documents into a single group
                    totalUsersSum: { $sum: '$total_users' },
                    dailyUsersSum: { $sum: '$daily_users' }
                }
            }
        ])

        if (statistic1 == null)
            statistic1 = new Statistics()
        return statistic1;
    } catch (error) {
        console.log(error);
    }
}

const getStatistics = async (req, res) => {
    try {
        let today = new Date();
        today.setHours(0, 0, 0, 0);
        console.log(today)

        let yesterday = new Date(Date.now() - 1000 * 60 * 60 * 24);
        yesterday.setHours(0, 0, 0, 0)

        let result = [];

        let statistic1 = await Statistics.aggregate([
            {
                $match: {
                    date: { $gte: today }
                }
            },
            {
                $group: {
                    _id: null, // Group all documents into a single group
                    daily_bets: { $sum: '$daily_bets' },
                    daily_bet_amount: { $sum: '$daily_bet_amount' },
                    daily_bet_users: { $sum: '$daily_bet_users' },
                    daily_wins: { $sum: '$daily_wins' },
                    daily_loss: { $sum: '$daily_loss' },
                    total_bet_users: { $sum: '$total_bet_users' },
                }
            }
        ])

        let statistic2 = await Statistics.aggregate([
            {
                $match: {
                    date: { $gte: yesterday }
                }
            },
            {
                $group: {
                    _id: null, // Group all documents into a single group
                    daily_bets: { $sum: '$daily_bets' },
                    daily_bet_amount: { $sum: '$daily_bet_amount' },
                    daily_bet_users: { $sum: '$daily_bet_users' },
                    daily_wins: { $sum: '$daily_wins' },
                    daily_loss: { $sum: '$daily_loss' },
                    total_bet_users: { $sum: '$total_bet_users' },
                }
            }
        ])

        if (statistic1.length === 0) {
            statistic1 = [{
                _id: null,
                daily_bets: 0,
                daily_bet_amount: 0,
                daily_bet_users: 0,
                daily_wins: 0,
                daily_loss: 0,
                total_bet_users: statistic2[0].total_bet_users,
            }]
        }
        result.push(statistic1[0])
        statistic2[0].total_bet_users = statistic1[0].total_bet_users
        result.push(statistic2[0])

        let statistic14 = await Statistics.aggregate([
            {
                $match: {
                    date: { $gte: new Date(Date.now() - 1000 * 60 * 60 * 24 * 14) }
                }
            },
            {
                $group: {
                    _id: null, // Group all documents into a single group
                    daily_bets: { $sum: '$daily_bets' },
                    daily_bet_amount: { $sum: '$daily_bet_amount' },
                    daily_bet_users: { $sum: '$daily_bet_users' },
                    daily_wins: { $sum: '$daily_wins' },
                    daily_loss: { $sum: '$daily_loss' },
                    total_bet_users: { $sum: '$total_bet_users' },
                }
            }
        ])
        statistic14[0].total_bet_users = statistic1[0].total_bet_users
        result.push(statistic14[0])

        let statistic30 = await Statistics.aggregate([
            {
                $match: {
                    date: { $gte: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30) }
                }
            },
            {
                $group: {
                    _id: null, // Group all documents into a single group
                    daily_bets: { $sum: '$daily_bets' },
                    daily_bet_amount: { $sum: '$daily_bet_amount' },
                    daily_bet_users: { $sum: '$daily_bet_users' },
                    daily_wins: { $sum: '$daily_wins' },
                    daily_loss: { $sum: '$daily_loss' },
                    total_bet_users: { $sum: '$total_bet_users' },
                }
            }
        ])
        statistic30[0].total_bet_users = statistic1[0].total_bet_users
        result.push(statistic30[0])

        let statistic365 = await Statistics.aggregate([
            {
                $match: {
                    date: { $gte: new Date(Date.now() - 1000 * 60 * 60 * 24 * 365) }
                }
            },
            {
                $group: {
                    _id: null, // Group all documents into a single group
                    daily_bets: { $sum: '$daily_bets' },
                    daily_bet_amount: { $sum: '$daily_bet_amount' },
                    daily_bet_users: { $sum: '$daily_bet_users' },
                    daily_wins: { $sum: '$daily_wins' },
                    daily_loss: { $sum: '$daily_loss' },
                    total_bet_users: { $sum: '$total_bet_users' },
                }
            }
        ])
        statistic365[0].total_bet_users = statistic1[0].total_bet_users
        result.push(statistic365[0])

        let statisticMax = await Statistics.aggregate([
            {
                $group: {
                    _id: null, // Group all documents into a single group
                    daily_bets: { $sum: '$daily_bets' },
                    daily_bet_amount: { $sum: '$daily_bet_amount' },
                    daily_bet_users: { $sum: '$daily_bet_users' },
                    daily_wins: { $sum: '$daily_wins' },
                    daily_loss: { $sum: '$daily_loss' },
                    total_bet_users: { $sum: '$total_bet_users' },
                }
            }
        ])
        statisticMax[0].total_bet_users = statistic1[0].total_bet_users
        result.push(statisticMax[0])
        return res.json(result);
    } catch (error) {
        console.log(error);
        res.status(500).json("Server Error")
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

const updateTotalBalanceAndCredits = async (ETH_balance, credits) => {

    try {
        const statistic = await Capital.findOne({}, {}, {
            sort: {
                _id: -1
            }
        });
        const creditsETH = await USD2Ether(credits);
        statistic.total += (creditsETH + ETH_balance);
        await statistic.save();
    } catch (error) {
        console.log(error);
    }

}

module.exports = {
    getStatistics,
    updateTotal,
    updateBetWithDaily,
    updateBetWithNew,
    getTotalUserWithBet,
    getUserBetStats,
    updateBetResult,
    updateTotalBalanceAndCredits,
    updateTotalUsers
}