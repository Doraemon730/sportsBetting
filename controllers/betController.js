const Bet = require("../models/Bet");
const Contest = require("../models/Contest");
const User = require("../models/User");
const Transaction = require("../models/Transaction");
const Ethereum = require("../models/Ethereum");
const { ObjectId } = require("mongodb");
const { USD2Ether } = require("../utils/util");

const startBetting = async (req, res) => {
    try {
        const userId = new ObjectId(req.user.id);
        const user = await User.findOne({ _id: userId });
        const { entryFee, betType, picks } = req.body;

        const entryFeeEther = USD2Ether(entryFee);

        if (!user || user.ETH_balance < entryFeeEther) {
            return res.status(400).json({ message: "Insufficient Balance." });
        }

        const jsonArray = JSON.parse(picks);
        for (const element of jsonArray) {
            const contestId = new ObjectId(element.contestId);

            const contest = await Contest.findById(contestId);
            if (!contest) {
                continue;
            }

            let participants = contest.participants || [];
            if (!participants.includes(contestId)) {
                participants.push(contestId);
                contest.participants = participants;
                await contest.save();
            }
        }

        const myBet = new Bet({
            userId,
            entryFee: entryFeeEther,
            betType,
            picks: jsonArray
        });
        await myBet.save();

        user.Fiat_balance -= entryFeeEther;
        await user.save();

        const transaction = new Transaction({
            userId,
            amount: entryFeeEther,
            transactionType: "bet"
        });
        await transaction.save();

        res.json(myBet);
    } catch (error) {
        res.status(500).json(error.message);
    }
}

const isAllowedSixLegParlay = async (req, res) => {
    const userId = new ObjectId(req.user.id);
    const user = await User.findOne({ _id: userId }).populate('promotion');
    if (user.promotion.approach != 1)
        res.status(403).json({ message: 'Sorry, the option to place a six-leg parlay is not available.' });
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Set the time to the start of the day
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
const sixLegParlayBetting = async (req, res) => {
    try {
        const userId = new ObjectId(req.user.id);
        const user = await User.findOne({ _id: userId }).populate('promotion');
        if (user.promotion.approach != 1)
            res.status(403).json({ message: 'Sorry, the option to place a six-leg parlay is not available.' });
        const today = new Date();
        today.setHours(0, 0, 0, 0); // Set the time to the start of the day
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
        for (const element of jsonArray) {
            const contestId = new ObjectId(element.contestId);

            const contest = await Contest.findById(contestId);
            if (!contest) {
                continue;
            }

            let participants = contest.participants || [];
            if (!participants.includes(contestId)) {
                participants.push(contestId);
                contest.participants = participants;
                await contest.save();
            }
        }
        const myBet = new Bet({
            userId,
            entryFee,
            betType,
            picks: jsonArray,
            parlay: true,
            palrayNumber
        });
        await myBet.save();
        if (palrayNumber == 6) {
            user.promotion = new ObjectId('64fbe8cd009753bb7aa7a4fb');
            await user.save();
        }
        res.status(200).json(myBet);

    } catch (error) {
        res.status(500).json(error.message);
    }
}

module.exports = {
    startBetting,
    sixLegParlayBetting,
    isAllowedSixLegParlay
}