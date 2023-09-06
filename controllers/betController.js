const Bet = require("../models/Bet");
const Contest = require("../models/Contest");
const { ObjectId } = require("mongodb");

const startBetting = async (req, res) => {

    try {
        user = req.user;
        userId = new ObjectId(user.id);
        const { entryFee, betType, picks } = req.body;
        jsonArray = JSON.parse(picks);
        jsonArray.forEach(async element => {
            element.playerId = new ObjectId(element.playerId);
            element.contestId = new ObjectId(element.contestId);
            const contest = await Contest.findById(element.contestId);
            participants = contest.participants;
            if (!participants) {
                participants = [];
            }
            if (!participants.includes(userId)) {
                participants.push(userId);
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
        res.json(myBet);
    } catch (error) {
        res.status(500).json(error.message);
    }

}

module.exports = {
    startBetting
}