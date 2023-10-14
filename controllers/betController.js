const Bet = require("../models/Bet");
require('../utils/log');
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
const { updateBetWithNew, updateBetWithDaily, updateTotalBalanceAndCredits } = require("../controllers/statisticsController")

const startBetting = async (req, res) => {
    try {
        const userId = new ObjectId(req.user.id);
        let { entryFee, betType, picks, currencyType } = req.body;

        const jsonArray = JSON.parse(picks);
        if (jsonArray.length < 2 || jsonArray.length > 6) {
            return res.status(400).json({ message: "Invalid Betting." });
        }

        let user = await User.findOne({ _id: userId });
        if (user.isPending) {
            return res.status(400).json({ message: "You are pending." });
        }
        user.isPending = true;
        await user.save();

        if (currencyType === "ETH") {
            entryFee = await Ether2USD(entryFee);
        }

        const entryFeeEtherSave = await USD2Ether(entryFee);
        const entryFeeSave = entryFee;
        let temp = user.credits;
        let creditSave = 0;
        user.credits -= entryFee;
        creditSave = user.credits > 0 ? entryFee : temp;
        user.credits = user.credits > 0 ? user.credits : 0;
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

        for (const element of jsonArray) {
            const eventId = new ObjectId(element.contestId);

            const event = await Event.findById(eventId);
            if (!event) {
                user.isPending = false;
                await user.save();
                return res.status(400).send({ message: "Invalid Contest." });
            }

            if (event.startTime <= new Date().getTime()) {
                user.isPending = false;
                await user.save();
                return res.status(400).send({ message: "Contest has already started." });
            }

            if (!event.participants.includes(myBet._id)) {
                event.participants.push(myBet._id);
                await event.save();
            }
        }
        user.ETH_balance -= entryFeeEther;
        user.totalBetAmount += parseFloat(entryFeeSave);
        user = setUserLevel(user);
        await updateTotalBalanceAndCredits(0 - entryFeeEther, 0 - creditSave);

        user.isPending = false;

        await myBet.save();
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
        user.password = undefined;
        user.privateKey = undefined;
        res.json({ betInfo: myBet, userInfo: user });
    } catch (error) {
        console.log(error);
        res.status(500).send('Server error');
    }
}

const startFirstFreeBetting = async (req, res) => {
    try {
        const userId = new ObjectId(req.user.id);
        let { entryFee, betType, picks, currencyType } = req.body;
        const jsonArray = JSON.parse(picks);

        if (jsonArray.length !== 6) {
            return res.status(400).json({ message: "Invalid Betting." });
        }

        let user = await User.findOne({ _id: userId });
        if (user.isPending) {
            return res.status(400).json({ message: "You are pending." });
        }
        user.isPending = true;
        await user.save();

        if (currencyType === "ETH") {
            entryFee = await Ether2USD(entryFee);
        }

        const entryFeeEtherSave = await USD2Ether(entryFee);
        const entryFeeSave = entryFee;

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
            parlay: true,
            credit: 0,
        });


        for (const element of jsonArray) {
            const eventId = new ObjectId(element.contestId);

            const event = await Event.findById(eventId);
            if (!event) {
                user.isPending = false;
                await user.save();
                return res.status(400).send({ message: "Invalid Contest." });
            }
            if (event.startTime <= new Date().getTime()) {
                user.isPending = false;
                await user.save();
                return res.status(400).send({ message: "Contest has already started." });
            }

            if (!event.participants.includes(myBet._id)) {
                event.participants.push(myBet._id);
                await event.save();
            }
        }

        user.freeSix = -1;
        user.totalBetAmount += parseFloat(entryFeeSave);
        user = setUserLevel(user);

        user.isPending = false;

        await myBet.save();
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
        user.password = undefined;
        user.privateKey = undefined;
        res.json({ betInfo: myBet, userInfo: user });
    } catch (error) {
        console.log(error);
        res.status(500).send('Server error');
    }
}

const startWednesdayFreeBetting = async (req, res) => {
    try {
        const userId = new ObjectId(req.user.id);

        let { entryFee, betType, picks, currencyType } = req.body;

        const jsonArray = JSON.parse(picks);

        if (jsonArray.length !== 6) {
            return res.status(400).json({ message: "Invalid Betting." });
        }

        let user = await User.findOne({ _id: userId });
        if (user.isPending) {
            return res.status(400).json({ message: "You are pending." });
        }
        user.isPending = true;
        await user.save();

        if (currencyType === "ETH") {
            entryFee = await Ether2USD(entryFee);
        }

        const entryFeeEtherSave = await USD2Ether(entryFee);
        const entryFeeSave = entryFee;

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
            parlay: true,
            credit: 0,
        });


        for (const element of jsonArray) {
            const eventId = new ObjectId(element.contestId);

            const event = await Event.findById(eventId);
            if (!event) {
                user.isPending = false;
                await user.save();
                return res.status(400).send({ message: "Invalid Contest." });
            }

            if (event.startTime <= new Date().getTime()) {
                user.isPending = false;
                await user.save();
                return res.status(400).send({ message: "Contest has already started." });
            }

            if (!event.participants.includes(myBet._id)) {
                event.participants.push(myBet._id);
                await event.save();
            }
        }

        user.promotion = new ObjectId('64fbe8cd009753bb7aa7a4fb');
        user.totalBetAmount += parseFloat(entryFeeSave);
        user = setUserLevel(user);

        user.isPending = false;

        await myBet.save();
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
        user.password = undefined;
        user.privateKey = undefined;
        res.json({ betInfo: myBet, userInfo: user });
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
        results.results = await Bet.find({ userId }).skip(startIndex).limit(limit).populate({
            path: 'picks.playerId',
            select: '_id name position jerseyNumber headshot'
        }).populate({
            path: 'picks.contestId',
            select: '_id startTime name'
        }).populate({
            path: 'picks.teamId',
            select: '_id name'
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
        results.results = await Bet.find({ userId }).skip(startIndex).limit(limit).populate({
            path: 'picks.playerId',
            select: '_id name position jerseyNumber headshot'
        }).populate({
            path: 'picks.contestId',
            select: '_id startTime name'
        }).populate({
            path: 'picks.teamId',
            select: '_id name'
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
        }).populate({
            path: 'picks.contestId',
            select: '_id startTime name'
        });
        res.json(results);
    } catch (error) {
        console.log(error);
        res.status(500).send('Server error');
    }
}

const cancelBet = async (req, res) => {
    try {
        const { betId } = req.body;
        if (!betId)
            return res.status(404).json("Invalid Bet!");
        const bet = await Bet.findOne({ _id: new ObjectId(betId) });
        if (!bet) {
            return res.status(404).json("Invalid Bet!");
        }
        const now = new Date();
        const diff = Math.abs(now - bet.createdAt) / (1000 * 60);
        if (diff < 5) {
            let user = await User.findOne({ _id: bet.userId });
            if (bet.parlay) {
                if (bet.entryFee == 10)
                    user.firstSix = 1;
                if (bet.entryFee == 25)
                    user.promotion = new ObjectId('64fbe8cd009753bb7aa7a4fb');
            } else {
                if (bet.credit > 0)
                    user.credits += bet.credit;
                let entryETH = await USD2Ether(bet.entryFee - bet.credit);
                user.ETH_balance += entryETH;
                await updateTotalBalanceAndCredits(entryETH, bet.credit);
            }
            user.totalBetAmount -= bet.entryFee
            user = setUserLevel(user);
            await user.save();
            bet.status = 'canceled';
            await bet.save();
            user.password = undefined;
            user.privateKey = undefined;
            res.json({ betInfo: bet, userInfo: user });
        } else
            res.status(400).json("Bet cannot be removed as it's been over 5 minutes");
    } catch (error) {
        res.status(500).send('Server error');
    }
}

const getRewards = async (days) => {
    const daysAgo = new Date();
    daysAgo.setDate(daysAgo.getDate() - days);
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

        await updateTotalBalanceAndCredits(0, weeklyBet.totalLost * percentage * 0.01);
        await user.save();
    }
}

const udpateEventsByBet = async (req, res) => {
    try {
        const bets = await Bet.find({ status: "pending" });
        for (let bet of bets) {
            for (let pick of bet.picks) {
                if (!pick.result) {
                    const event = await Event.findById(pick.contestId);
                    if (event && event.state === 3) {
                        event.state = 2;
                        await event.save();
                    }
                }
            }
        }
        res.send("Success")
    } catch (error) {
        console.log(error);
        res.status(500).send("Server Error");
    }
}

const getRewardsPercentage = (level) => {
    percentage = 0;
    switch (level) {
        case "Rookie":
            percentage = 0.003;
            break;
        case "Bronze":
            percentage = 0.006;
            break;
        case "Silver":
            percentage = 0.009;
            break;
        case "Gold":
            percentage = 0.012;
            break;
        case "Gold II":
            percentage = 0.015;
            break;
        case "Plantium":
            percentage = 0.018;
            break;
        case "Plantium II":
            percentage = 0.021;
            break;
        case "Plantium III":
            percentage = 0.024;
            break;
        case "Diamond":
            percentage = 0.027;
            break;
        case "Diamond II":
            percentage = 0.030;
            break;
        case "Diamond III":
            percentage = 0.033;
            break;
        case "Predator":
            percentage = 0.036;
            break;
        case "Predator II":
            percentage = 0.039;
            break;
        case "Predator III":
            percentage = 0.042;
            break;
        case "Prestige":
            percentage = 0.045;
            break;
    }
    return percentage;
}

const giveRewards = async (req, res) => {
    const { userId, days } = req.body;

    let daysAgo = new Date();
    daysAgo.setDate(daysAgo.getDate() - days);
    const user = await User.findOne({ _id: userId });
    if (user.rewards == undefined ||
        user.rewards.receiveDate == undefined ||
        user.rewards.receiveDate < daysAgo) {
        const weeklyBets = await Bet.find({
            userId: userId,
            status: 'lost',
            createdAt: {
                $gte: daysAgo
            }
        });
        const totalLost = weeklyBets.reduce((sum, bet) => sum + bet.entryFee, 0);
        console.log(totalLost)
        const percentage = getRewardsPercentage(user.level);

        console.log(percentage)
        if (user.rewards == undefined) {
            user.rewards.amount = totalLost * percentage * 0.01;
            user.rewards.receiveDate = new Date();
        } else {
            user.rewards.amount += totalLost * percentage * 0.01;
            user.rewards.receiveDate = new Date();
        }
        // await updateTotalBalanceAndCredits(0, weeklyBet.totalLost * percentage * 0.01);
        await user.save();
        return res.json(user)
    }
    return res.json("You have already given the rewards")
}

module.exports = {
    startBetting,
    getAllBets,
    getAllBetsByUserId,
    getAllBetsByUserIdAdmin,
    cancelBet,
    getRewards,
    startFirstFreeBetting,
    startWednesdayFreeBetting,
    udpateEventsByBet,
    giveRewards
}