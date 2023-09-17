const Bet = require("../models/Bet");
const Contest = require("../models/Contest");
const User = require("../models/User");
const Transaction = require("../models/Transaction");
const Ethereum = require("../models/Ethereum");
const Referral = require("../models/Referral");
const { updateBetWithNew, updateBetWithDaily } = require('./statisticsController');
const { ObjectId } = require("mongodb");
const { USD2Ether, Ether2USD } = require("../utils/util");

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
        let { entryFee, betType, picks, currencyType } = req.body;

        // entryFee = parseFloat(entryFee)

        const jsonArray = JSON.parse(picks);
        if (jsonArray.length < 2 || jsonArray.length > 6) {
            return res.status(400).json({ message: "Invalid Betting." });
        }

        const user = await User.findOne({ _id: userId });

        if (currencyType === "ETH") {
            entryFee = await Ether2USD(entryFee);
        }

        const entryFeeEtherSave = await USD2Ether(entryFee);

        let temp = user.credits;
        user.credits -= entryFee;
        entryFee = entryFee - temp;
        entryFee = entryFee > 0 ? entryFee : 0;
        user.credits = user.credits > 0 ? user.credits : 0;

        const entryFeeEther = await USD2Ether(entryFee);

        if (!user || user.ETH_balance < entryFeeEther) {
            return res.status(400).json({ message: "Insufficient Balance." });
        }

        for (const element of jsonArray) {
            const contestId = new ObjectId(element.contestId);

            const contest = await Contest.findById(contestId);
            if (!contest) {
                return res.status(400).json({ message: "Invalid Contest." });
            }

            let participants = contest.participants || [];
            if (!participants.includes(contestId)) {
                participants.push(contestId);
                contest.participants = participants;
                await contest.save();
            }
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
            entryFee: entryFeeEtherSave,
            betType,
            picks: jsonArray
        });
        await myBet.save();

        user.ETH_balance -= entryFeeEther;
        await user.save();

        const transaction = new Transaction({
            userId,
            amount: entryFeeEtherSave,
            transactionType: "bet"
        });
        await transaction.save();
        if (isNew) {
            await updateBetWithNew(entryFeeEtherSave);

        } else {
            await updateBetWithDaily(isFirst, entryFeeEtherSave);
        }
        getReferralPrize(user.referralCode, user._id, entryFeeEtherSave);
        res.json(myBet);
    } catch (error) {
        res.status(500).json(error.message);
    }
}

const getReferralPrize = async (referralCode, invitedUserId, betAmount) => {
    const referral = await Referral.findOne({ referralCode });
    if (!referral) {
        return;
    }
    const user = await User.findOne({ _id: referral.userId });

    const checkUserLevel = () => {
        const bettingUsers = referral.invitesList.filter((i) => i.betAmount > 0);
        if (bettingUsers.length > 1) {
            if (referral.level == 1) {
                referral.level = 2;
                const sum = bettingUsers.reduce((a, b) => a + b.betAmount, 0);
                user.ETH_balance += sum * 0.003;
            }
            if (bettingUsers.length > 250) {
                if (referral.level == 2) {
                    referral.level = 3;
                    const sum = bettingUsers.reduce((a, b) => a + b.betAmount, 0);
                    user.ETH_balance += sum * 0.0035;
                }
            }
        }
    }
    const updatedList = referral.invitesList.map((i) => {
        if (i.invitedUserId.toString() === invitedUserId.toString()) {
            i.betAmount += parseFloat(betAmount);
        }
        return i;
    });
    referral.invitesList = updatedList;
    switch (referral.level) {
        case 1:
            user.ETH_balance += betAmount * 0.007;
            checkUserLevel();
            break;
        case 2:
            user.ETH_balance += betAmount * 0.01;
            checkUserLevel();
            break;
        case 3:
            user.ETH_balance += betAmount * 0.0135;
            break;
    }
    await referral.save();
    await user.save();
}

const getAllBetsByUserId = async (req, res) => {
    try {
        const userId = new ObjectId(req.user.id);
        const myBets = await Bet.find({ userId: userId });
        res.json(myBets);
    } catch (error) {
        res.status(500).json(error.message);
    }
}

const getAllBets = async (req, res) => {
    try {
        const myBets = await Bet.find();
        res.json(myBets);
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
        if (checkBet(myBet)) {
            res.status(403).json({ message: 'Sorry, you have to select different bet' });
        }
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
        let palrayNumber = 0;
        let entryFee = 25;
        let betType = 'high';
        for (const pick of picks) {

            palrayNumber++;
            if (palrayNumber != 1)
                entryFee = 0;

            const jsonArray = JSON.parse(pick);
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
            if (checkBet(myBet)) {
                res.status(403).json({ message: 'Sorry, you have to select different bet' });
            }
            await myBet.save();

        }
        user.promotion = new ObjectId('64fbe8cd009753bb7aa7a4fb');
        await user.save();

        res.status(200).json("six leg parlay successed.");

    } catch (error) {
        res.status(500).json(error.message);
    }
}

module.exports = {
    startBetting,
    sixLegParlayBetting,
    isAllowedSixLegParlay,
    getAllBets,
    getAllBetsByUserId,
    getReferralPrize
}