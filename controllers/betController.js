const Bet = require("../models/Bet");
const Contest = require("../models/Contest");
const User = require("../models/User");
const Transaction = require("../models/Transaction");
const Ethereum = require("../models/Ethereum");
const { ObjectId } = require("mongodb");

const startBetting = async (req, res) => {
    try {
        const userId = new ObjectId(req.user.id);
        const user = await User.findOne({ _id: userId });
        const { entryFee, betType, picks } = req.body;

        const etherPrice = await Ethereum.find();

        const entryFeeEther = entryFee / etherPrice[0].price;

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

module.exports = {
    startBetting
}