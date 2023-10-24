const Bet = require("../models/Bet");
require('../utils/log');
const Contest = require("../models/Contest");
const User = require("../models/User");
const Transaction = require("../models/Transaction");
const Ethereum = require("../models/Ethereum");
const Referral = require("../models/Referral");
const Event = require('../models/Event');
const Player = require('../models/Player');
const Prop = require('../models/Prop');
const Capital = require('../models/Capital');
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
            user.isPending = false;
            await user.save();
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
            let NBAProps = ["Points", "Assists", "Rebounds", "3-PT Made", "Steals", "Blocks", "Turnovers", "Points+Rebounds", "Points+Assists", "Rebounds+Assists", "Pts+Rebs+Asts", "Blocks+Steals"]
            if (NBAProps.includes(element.prop.propName)) {
                const player = await Player.findById(new ObjectId(element.playerId))
                const propId = await Prop.findOne({ displayName: element.prop.propName })
                let index = player.odds.findIndex(item => String(item.id) == String(propId._id))
                if (index < 0) {
                    user.isPending = false;
                    await user.save();
                    return res.status(400).send({ message: "Invalid Betting." });
                }
                if (element.prop.odds != player.odds[index].value) {
                    user.isPending = false;
                    await user.save();
                    return res.status(400).send({ message: "Invalid Betting." });
                }
            }

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
            select: '_id name position jerseyNumber headshot remoteId'
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

const cancelWrongBets = async (req, res) => {
    try {
        const { sportId } = req.body;
        const events = await Event.find({ sportId: new ObjectId(sportId) });
        events.forEach(event => {
            if (event.participants.length > 0) {
                let betIds = event.participants;
                betIds.forEach(async betId => {
                    const bet = await Bet.findOne({ _id: new ObjectId(betId) });
                    if (!bet) {
                        return;
                    }
                    if (bet.status == "canceled") {
                        return;
                    }
                    if (bet.status == "pending") {
                        console.log(bet._id)
                        let user = await User.findOne({ _id: bet.userId });
                        // if (bet.parlay) {
                        //     if (bet.entryFee == 10)
                        //         user.firstSix = 1;
                        //     if (bet.entryFee == 25)
                        //         user.promotion = new ObjectId('64fbe8cd009753bb7aa7a4fb');
                        // } else {
                        if (bet.credit > 0)
                            user.credits += bet.credit;
                        let entryETH = await USD2Ether(bet.entryFee - bet.credit);
                        user.ETH_balance += entryETH;
                        await updateTotalBalanceAndCredits(entryETH, bet.credit);
                        // }
                        user.totalBetAmount -= bet.entryFee
                        user = setUserLevel(user);
                        await user.save();
                        bet.status = 'canceled';
                        console.log(user);
                        console.log(bet);
                        await bet.save();
                    }
                })
            }
        });
    } catch (error) { }


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
        const percentage = getRewardsPercentage(user.level);
        if (days == 7) {
            if (user.weeklyRewards == undefined) {
                user.weeklyRewards.amount = totalLost * percentage * 0.01;
                user.weeklyRewards.receiveDate = new Date();
            } else {
                user.weeklyRewards.amount += totalLost * percentage * 0.01;
                user.weeklyRewards.receiveDate = new Date();
            }
        } else if (days == 30) {
            if (user.monthlyRewards == undefined) {
                user.monthlyRewards.amount = totalLost * percentage * 0.01;
                user.monthlyRewards.receiveDate = new Date();
            } else {
                user.monthlyRewards.amount += totalLost * percentage * 0.01;
                user.monthlyRewards.receiveDate = new Date();
            }
        }
        // await updateTotalBalanceAndCredits(0, weeklyBet.totalLost * percentage * 0.01);
        await user.save();
        return res.json(user)
    }
    return res.json("You have already given the rewards")
}

const getRevenue = async (req, res) => {
    try {
        let now = new Date();
        now.setHours(0, 0, 0, 0);
        const data_1 = await Bet.aggregate([{
            $match: {
                updatedAt: {
                    $gte: now,
                    $lte: new Date(Date.now())
                }
            }
        }, {
            $group: {
                _id: '$status',
                entryFee: { $sum: '$entryFeeETH' },
                prize: { $sum: '$prize' }
            }
        }]);

        let yesterday = new Date(Date.now() - 1000 * 60 * 60 * 24);
        yesterday.setHours(0, 0, 0, 0)
        const data_2 = await Bet.aggregate([{
            $match: {
                updatedAt: {
                    $gte: yesterday,
                    $lte: new Date(Date.now())
                }
            }
        }, {
            $group: {
                _id: '$status',
                entryFee: { $sum: '$entryFeeETH' },
                prize: { $sum: '$prize' }
            }
        }]);

        const data_14 = await Bet.aggregate([{
            $match: {
                updatedAt: {
                    $gte: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7),
                    $lte: new Date(Date.now())
                }
            }
        }, {
            $group: {
                _id: '$status',
                entryFee: { $sum: '$entryFeeETH' },
                prize: { $sum: '$prize' }
            }
        }])

        const data_30 = await Bet.aggregate([{
            $match: {
                updatedAt: {
                    $gte: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30),
                    $lte: new Date(Date.now())
                }
            }
        }, {
            $group: {
                _id: '$status',
                entryFee: { $sum: '$entryFeeETH' },
                prize: { $sum: '$prize' }
            }
        }])

        const data_365 = await Bet.aggregate([{
            $match: {
                updatedAt: {
                    $gte: new Date(Date.now() - 1000 * 60 * 60 * 24 * 365),
                    $lte: new Date(Date.now())
                }
            }
        }, {
            $group: {
                _id: '$status',
                entryFee: { $sum: '$entryFeeETH' },
                prize: { $sum: '$prize' }
            }
        }])

        const data_max = await Bet.aggregate([{
            $group: {
                _id: '$status',
                entryFee: { $sum: '$entryFeeETH' },
                prize: { $sum: '$prize' }
            }
        }])


        const statistic = await Capital.findOne({}, {}, {
            sort: {
                _id: -1
            }
        });

        result = { revenue: [], profit: [], total: statistic.total };
        if (!data_1) {
            result = { revenue: [0, 0, 0, 0, 0, 0], profit: [0, 0, 0, 0, 0, 0], total: statistic.total };
            return res.json(result);
        }
        let betAmount = 0;
        let prizeAmount = 0;

        const etherPrice = await Ethereum.find();
        const ether = etherPrice[0].price;
        for (let i = 0; i < data_1.length; i++) {
            if (data_1[i]._id == 'lost')
                betAmount += data_1[i].entryFee;
            if (data_1[i]._id == 'win')
                betAmount += data_1[i].entryFee;
            if (data_1[i]._id == 'win')
                prizeAmount += data_1[i].prize / ether;
        }
        result.revenue.push(betAmount);
        result.profit.push(betAmount - prizeAmount);

        betAmount = 0;
        prizeAmount = 0;
        for (let i = 0; i < data_2.length; i++) {
            if (data_2[i]._id == 'lost')
                betAmount += data_2[i].entryFee;
            if (data_2[i]._id == 'win')
                betAmount += data_2[i].entryFee;
            if (data_2[i]._id == 'win')
                prizeAmount += data_2[i].prize / ether;
        }
        result.revenue.push(betAmount);
        result.profit.push(betAmount - prizeAmount);

        betAmount = 0;
        prizeAmount = 0;
        for (let i = 0; i < data_14.length; i++) {
            if (data_14[i]._id == 'lost')
                betAmount += data_14[i].entryFee;
            if (data_14[i]._id == 'win')
                betAmount += data_14[i].entryFee;
            if (data_14[i]._id == 'win')
                prizeAmount += data_14[i].prize / ether;
        }
        result.revenue.push(betAmount);
        result.profit.push(betAmount - prizeAmount);

        betAmount = 0;
        prizeAmount = 0;
        for (let i = 0; i < data_30.length; i++) {
            if (data_30[i]._id == 'lost')
                betAmount += data_30[i].entryFee;
            if (data_30[i]._id == 'win')
                betAmount += data_30[i].entryFee;
            if (data_30[i]._id == 'win')
                prizeAmount += data_30[i].prize / ether;
        }
        result.revenue.push(betAmount);
        result.profit.push(betAmount - prizeAmount);

        betAmount = 0;
        prizeAmount = 0;
        for (let i = 0; i < data_365.length; i++) {
            if (data_365[i]._id == 'lost')
                betAmount += data_365[i].entryFee;
            if (data_365[i]._id == 'win')
                betAmount += data_365[i].entryFee;
            if (data_365[i]._id == 'win')
                prizeAmount += data_365[i].prize / ether;
        }
        result.revenue.push(betAmount);
        result.profit.push(betAmount - prizeAmount);

        betAmount = 0;
        prizeAmount = 0;
        for (let i = 0; i < data_max.length; i++) {
            if (data_max[i]._id == 'lost')
                betAmount += data_max[i].entryFee;
            if (data_max[i]._id == 'win')
                betAmount += data_max[i].entryFee;
            if (data_max[i]._id == 'win')
                prizeAmount += data_max[i].prize / ether;
        }
        result.revenue.push(betAmount);
        result.profit.push(betAmount - prizeAmount);

        res.json(result);
    } catch (error) {
        res.status(500).send('Server error');
    }
}

const changeBet = async (req, res) => {
    try{
        let bet = await Bet.findById(new ObjectId("6519980e644c75165594de46"));
        delete bet.updateAt;
        await bet.save();
        // let bets = await Bet.find();

        // for(let bet of bets) {
        //     if(bet.updateAt){
        //         delete bet.updateAt;            
        //         await bet.save();
        //     }
        // }        
        res.json("success");
    } catch(error){
        console.log(error);
    }
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
    giveRewards,
    cancelWrongBets,
    getRevenue,
    changeBet
}