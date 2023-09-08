const Bet = require("../models/Bet");
const Contest = require("../models/Contest");
const User = require("../models/User");
const Transaction = require("../models/Transaction");
const { ObjectId } = require("mongodb");

const startBetting = async (req, res) => {
    try {
        const userId = new ObjectId(req.user.id);
        const user = await User.findOne({ _id: userId });
        const { entryFee, betType, picks } = req.body;

        if (!user || user.ETH_balance < 0) {
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
            entryFee,
            betType,
            picks: jsonArray
        });
        await myBet.save();

        user.Fiat_balance -= entryFee;
        await user.save();

        const transaction = new Transaction({
            userId,
            amount: entryFee,
            transactionType: "bet",
            currency: "USD"
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