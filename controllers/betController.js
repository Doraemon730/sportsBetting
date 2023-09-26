const Bet = require("../models/Bet");
const Contest = require("../models/Contest");
const User = require("../models/User");
const Transaction = require("../models/Transaction");
const Ethereum = require("../models/Ethereum");
const Referral = require("../models/Referral");
const Event = require('../models/Event');
const { getReferralPrize } = require("../controllers/referralController")
const { ObjectId } = require("mongodb");
const { USD2Ether, Ether2USD } = require("../utils/util");
const { setUserLevel } = require("../controllers/userController");
const { updateBetWithNew, updateBetWithDaily } = require("../controllers/statisticsController")

const checkBet = async (newbet) => {
    try {
        const bet = await Bet.findOne({
            userId: newbet.userId,
            entryFee: newbet.entryFee,
            betType: newbet.betType,
            picks: newbet.picks,
            parlay: newbet.parlay,
            palrayNumber: newbet.palrayNumber
        })
        if (bet)
            return true;
        return false;
    } catch (error) {
        console.log(error);
    }
}

const startBetting = async (req, res) => {
    try {
        const userId = new ObjectId(req.user.id);
        console.log(req.body);
        let { entryFee, betType, picks, currencyType } = req.body;
        console.log(entryFee, betType, picks, currencyType);

        const jsonArray = JSON.parse(picks);
        console.log(jsonArray);
        if (jsonArray.length < 2 || jsonArray.length > 6) {
            return res.status(400).json({ message: "Invalid Betting." });
        }

        let user = await User.findOne({ _id: userId });

        if (currencyType === "ETH") {
            entryFee = await Ether2USD(entryFee);
        }

        const entryFeeEtherSave = await USD2Ether(entryFee);
        const entryFeeSave = entryFee;
        let temp = user.credits;
        let creditSave = 0;
        user.credits -= entryFee;
        creditSave = user.credits > 0 ? entryFee : temp;
        user.credits = user.credits > 0 ? creditSave = entryFee : 0;
        entryFee = entryFee - temp;
        entryFee = entryFee > 0 ? entryFee : 0;


        const entryFeeEther = await USD2Ether(entryFee);

        if (!user || user.ETH_balance < entryFeeEther) {
            return res.status(400).json({ message: "Insufficient Balance." });
        }


        let isNew = false, isFirst = false;
        const bet = await Bet.findOne({ userId }).sort({ createdAt: -1 }).exec();
        if (!bet) {
            isNew = true;
        } else {
            let now = new Date();
            if (now.getDate() !== bet.createdAt.getDate()) {
                isFirst = true;
            }
        }

        const myBet = new Bet({
            userId,
            entryFee: entryFeeSave,
            entryFeeETH: entryFeeEtherSave,
            betType,
            picks: jsonArray,
            credit: creditSave,
        });

        await myBet.save();

        for (const element of jsonArray) {
            const eventId = new ObjectId(element.contestId);

            const event = await Event.findById(eventId);
            if (!event) {
                return res.status(400).send({ message: "Invalid Contest." });
            }

            event.participants.push(myBet._id);
            await event.save();
        }
        user.ETH_balance -= entryFeeEther;
        user.totalBetAmount += parseFloat(entryFeeSave);
        user = setUserLevel(user);
        await user.save();

        const transaction = new Transaction({
            userId,
            amountETH: entryFeeEtherSave,
            amountUSD: entryFeeSave,
            transactionType: "bet"
        });
        await transaction.save();
        if (isNew) {
            await updateBetWithNew(entryFeeEtherSave);

        } else {
            await updateBetWithDaily(isFirst, entryFeeEtherSave);
        }
        getReferralPrize(user._id, entryFeeEtherSave);
        res.json(myBet);
    } catch (error) {
        console.log(error);
        res.status(500).send('Server error');
    }
}

const getAllBetsByUserId = async (req, res) => {
    try {
        const userId = new ObjectId(req.user.id);
        const page = parseInt(req.body.page) || 1;
        const limit = parseInt(req.body.limit) || 10;

        const count = await Bet.find({ userId }).countDocuments();
        const totalPages = Math.ceil(count / limit);

        const startIndex = (page - 1) * limit;
        const endIndex = page * limit;

        const results = {};

        if (endIndex < count) {
            results.next = {
                page: page + 1,
                limit: limit
            };
        }

        if (startIndex > 0) {
            results.previous = {
                page: page - 1,
                limit: limit
            };
        }

        results.totalPages = totalPages;
        results.results = await Bet.find().skip(startIndex).limit(limit).populate({
            path: 'picks.playerId',
            select: '_id name position jerseyNumber headshot'
        });
        res.json(results);
    } catch (error) {
        res.status(500).send('Server error');
    }
}

const getAllBetsByUserIdAdmin = async (req, res) => {
    try {
        const { userId } = req.body;
        const page = parseInt(req.body.page) || 1;
        const limit = parseInt(req.body.limit) || 10;

        const count = await Bet.find({ userId }).countDocuments();
        const totalPages = Math.ceil(count / limit);

        const startIndex = (page - 1) * limit;
        const endIndex = page * limit;

        const results = {};

        if (endIndex < count) {
            results.next = {
                page: page + 1,
                limit: limit
            };
        }

        if (startIndex > 0) {
            results.previous = {
                page: page - 1,
                limit: limit
            };
        }

        results.totalPages = totalPages;
        results.results = await Bet.find().skip(startIndex).limit(limit).populate({
            path: 'picks.playerId',
            select: '_id name position jerseyNumber headshot'
        });
        res.json(results);
    } catch (error) {
        res.status(500).send('Server error');
    }
}

const getAllBets = async (req, res) => {
    try {
        const page = parseInt(req.body.page) || 1;
        const limit = parseInt(req.body.limit) || 10;

        const count = await Bet.countDocuments();
        const totalPages = Math.ceil(count / limit);

        const startIndex = (page - 1) * limit;
        const endIndex = page * limit;

        const results = {};

        if (endIndex < count) {
            results.next = {
                page: page + 1,
                limit: limit
            };
        }

        if (startIndex > 0) {
            results.previous = {
                page: page - 1,
                limit: limit
            };
        }

        results.totalPages = totalPages;
        results.results = await Bet.find().skip(startIndex).limit(limit).populate({
            path: 'picks.playerId',
            select: '_id name position jerseyNumber headshot'
        });
        res.json(results);
    } catch (error) {
        res.status(500).send('Server error');
    }
}

const isAllowedSixLegParlay = async (req, res) => {
    const userId = new ObjectId(req.user.id);
    const user = await User.findOne({ _id: userId }).populate('promotion');
    if (user.promotion.approach != 1)
        res.status(403).json({ message: 'Sorry, the option to place a six-leg parlay is not available.' });
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0); // Set the time to the start of the day
    const bet = await Bet.findOne({
        userId: userId, createdAt: {
            $gte: today,
            $lt: new Date(today.getTime() + 86400000),
        }, entryFee: {
            $gte: 25
        }
    });
    if (!bet) {
        res.status(403).json({ message: 'Sorry, the option to place a six-leg parlay is not available. In order to proceed, you are required to place a minimum bet of $25.' });
    }
    res.status(200).json({ message: 'You can proceed six leg parlay' });
}
const sixLegParlayBettingByStep = async (req, res) => {
    try {
        const userId = new ObjectId(req.user.id);
        const user = await User.findOne({ _id: userId }).populate('promotion');
        if (user.promotion.approach != 1)
            res.status(403).json({ message: 'Sorry, the option to place a six-leg parlay is not available.' });
        const today = new Date();
        today.setUTCHours(0, 0, 0, 0); // Set the time to the start of the day
        const bet = await Bet.findOne({
            userId: userId, createdAt: {
                $gte: today,
                $lt: new Date(today.getTime() + 86400000),
            }, entryFee: {
                $gte: 25
            }
        });
        if (!bet) {
            res.status(403).json({ message: 'Sorry, the option to place a six-leg parlay is not available. In order to proceed, you are required to place a minimum bet of $25.' });
        }
        const { betType, picks, palrayNumber } = req.body;
        if (palrayNumber > 6) {
            res.status(403).json({ message: 'Sorry, you can select only 6 bets' });
        }
        const entryFee = 25;
        const jsonArray = JSON.parse(picks);

        const myBet = new Bet({
            userId,
            entryFee,
            betType,
            picks: jsonArray,
            parlay: true,
            palrayNumber
        });
        if (checkBet(myBet)) {
            res.status(403).json({ message: 'Sorry, you have to select different bet' });
        }
        await myBet.save();
        for (const element of jsonArray) {
            const eventId = new ObjectId(element.contestId);

            const event = await Event.findById(eventId);
            if (!event) {
                return res.status(400).send({ message: "Invalid Contest." });
            }

            event.participants.push(myBet._id);
            await event.save();
        }
        if (palrayNumber == 6) {
            user.promotion = new ObjectId('64fbe8cd009753bb7aa7a4fb');
            await user.save();
        }
        res.status(200).json(myBet);

    } catch (error) {
        res.status(500).json(error.message);
    }
}
const sixLegParlayBetting = async (req, res) => {
    try {
        const userId = new ObjectId(req.user.id);
        const user = await User.findOne({ _id: userId }).populate('promotion');
        if (user.promotion.approach != 1)
            res.status(403).json({ message: 'Sorry, the option to place a six-leg parlay is not available.' });
        const today = new Date();
        today.setUTCHours(0, 0, 0, 0); // Set the time to the start of the day
        const bet = await Bet.findOne({
            userId: userId, createdAt: {
                $gte: today,
                $lt: new Date(today.getTime() + 86400000),
            }, entryFee: {
                $gte: 25
            }
        });
        if (!bet) {
            res.status(403).json({ message: 'Sorry, the option to place a six-leg parlay is not available. In order to proceed, you are required to place a minimum bet of $25.' });
        }
        const { picks } = req.body;
        let parlayNumber = 0;
        let entryFee = 25;
        let entryFeeETH = await USD2Ether(entryFee);
        let betType = 'high';
        for (const pick of picks) {

            parlayNumber++;
            if (parlayNumber != 1) {
                entryFee = 0;
                entryFeeETH = 0;
            }

            const jsonArray = JSON.parse(pick);


            const myBet = new Bet({
                userId,
                entryFeeETH,
                entryFee,
                betType,
                picks: jsonArray,
                parlay: true,
                parlayIndex: parlayNumber
            });
            if (checkBet(myBet)) {
                res.status(403).json({ message: 'Sorry, you have to select different bet' });
            }
            await myBet.save();
            for (const element of jsonArray) {
                const eventId = new ObjectId(element.contestId);

                const event = await Event.findById(eventId);
                if (!event) {
                    return res.status(400).send({ message: "Invalid Contest." });
                }

                event.participants.push(myBet._id);
                await event.save();
            }

        }
        user.promotion = new ObjectId('64fbe8cd009753bb7aa7a4fb');
        await user.save();

        res.status(200).json("six leg parlay successed.");

    } catch (error) {
        res.status(500).json(error.message);
    }
}
const firstSixLegParlayBetting = async (req, res) => {
    try {
        const userId = new ObjectId(req.user.id);
        const user = await User.findOne({ _id: userId }).populate('promotion');
        if (user.firstSix != 1)
            res.status(403).json({ message: 'Sorry, the option to place a six-leg parlay is not available.' });
        user.firstSix = -1;
        const { picks } = req.body;
        let parlayNumber = 0;
        let entryFee = 10;
        let entryFeeETH = await USD2Ether(entryFee);
        let betType = 'high';
        for (const pick of picks) {
            parlayNumber++;
            if (parlayNumber != 1) {
                entryFee = 0;
                entryFeeETH = 0;
            }
            const jsonArray = JSON.parse(pick);


            const myBet = new Bet({
                userId,
                entryFeeETH,
                entryFee,
                betType,
                picks: jsonArray,
                parlay: true,
                parlayIndex: parlayNumber
            });
            if (checkBet(myBet)) {
                res.status(403).json({ message: 'Sorry, you have to select different bet' });
            }
            await myBet.save();
            for (const element of jsonArray) {
                const eventId = new ObjectId(element.contestId);

                const event = await Event.findById(eventId);
                if (!event) {
                    return res.status(400).send({ message: "Invalid Contest." });
                }
                event.participants.push(myBet._id);
                await event.save();
            }

        }
        user.promotion = new ObjectId('64fbe8cd009753bb7aa7a4fb');
        await user.save();

        res.status(200).json("six leg parlay successed.");

    } catch (error) {
        res.status(500).json(error.message);
    }
}

const cancelBet = async (req, res) => {
    try {
        const { betId } = req.body;
        if (!betId)
            res.status(404).json("Invalid Bet!");
        const bet = await Bet.findOne({ _id: new ObjectId(betId) });
        if (!bet) {
            res.status(404).json("Invalid Bet!");
        }
        const now = new Date();
        const diff = Math.abs(now - bet.createdAt) / (1000 * 60);
        if (diff < 5) {
            const user = await User.findOne({ _id: bet.userId });
            if (bet.credit > 0)
                user.credits += bet.credit;
            user.ETH_balance += USD2Ether(Ether2USD(bet.entryFee) - bet.credit);
            await user.save();
            await Bet.deleteOne({ _id: new ObjectId(betId) });
            res.json("Bet removed successfully");
        } else
            res.status(400).json("Bet cannot be removed as it is older than 5 minutes");
    } catch (error) {
        res.status(500).send('Server error');
    }
}

const getRewards = async (days) => {
    const daysAgo = new Date();
    daysAgo.setDate(sevenDaysAgo.getDate() - days);
    const weeklyBets = await Bet.aggregate([
        {
            $match: {
                createdAt: {
                    $gte: daysAgo
                },
                status: 'lost'
            }
        },
        {
            $group: {
                _id: '$userId',
                totalLost: { $sum: '$entryFee' }
            }
        }
    ]);

    for (const weeklyBet of weeklyBets) {
        const user = await User.findOne({ _id: new ObjectId(weeklyBet._id) });
        if (!user)
            continue;
        const percentage = getRewardsPercentage(user.level);
        user.credits += weeklyBet.totalLost * percentage * 0.01;
        await user.save();
    }
}

const getRewardsPercentage = (level) => {
    percentage = 0;
    switch (level) {
        case "Rookie":
            percentage = 0.002;
            break;
        case "Bronze":
            percentage = 0.004;
            break;
        case "Silver":
            percentage = 0.006;
            break;
        case "Gold":
            percentage = 0.008;
            break;
        case "Gold II":
            percentage = 0.010;
            break;
        case "Plantium":
            percentage = 0.012;
            break;
        case "Plantium II":
            percentage = 0.014;
            break;
        case "Plantium III":
            percentage = 0.016;
            break;
        case "Diamond":
            percentage = 0.018;
            break;
        case "Diamond II":
            percentage = 0.020;
            break;
        case "Diamond III":
            percentage = 0.022;
            break;
        case "Predator":
            percentage = 0.024;
            break;
        case "Predator II":
            percentage = 0.026;
            break;
        case "Predator III":
            percentage = 0.028;
            break;
        case "Prestige":
            percentage = 0.030;
            break;
    }
    return percentage;
}

module.exports = {
    startBetting,
    sixLegParlayBetting,
    isAllowedSixLegParlay,
    getAllBets,
    getAllBetsByUserId,
    getAllBetsByUserIdAdmin,
    cancelBet,
    firstSixLegParlayBetting,
    getRewards
}