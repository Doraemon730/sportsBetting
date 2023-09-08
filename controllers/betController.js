const Bet = require("../models/Bet");
const Contest = require("../models/Contest");
const User = require("../models/User");
const Transaction = require("../models/Transaction");
const { ObjectId } = require("mongodb");

const startBetting = async (req, res) => {

    try {
        userId = new ObjectId(req.user.id);
        const user = await User.findOne({ _id: userId });
        const { entryFee, betType, picks } = req.body;

        if (user.ETH_balance < req.body.entryFee) {
            return res.status(400).json({ message: "Insufficient Balance." });
        }

        jsonArray = JSON.parse(picks);
        jsonArray.forEach(async element => {
            element.playerId = new ObjectId(element.playerId);
            element.contestId = new ObjectId(element.contestId);
            const contest = await Contest.findById(element.contestId);
            participants = contest.participants;
            if (!participants) {
                participants = [];
            }
            if (!participants.includes(element.contestId)) {
                participants.push(element.contestId);
                contest.participants = participants;
                await contest.save();
            }
        });

        const myBet = new Bet({
            userId,
            entryFee,
            betType,
            picks: jsonArray
        });
        await myBet.save();


        user.amount = user.amount - entryFee;
        await user.save();

        transaction = new Transaction({
            userId,
            amount: entryFee,
            type: "bet",
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