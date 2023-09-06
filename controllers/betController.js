const Player = require("../models/Player");
const Sport = require("../models/Sport");
const Contest = require("../models/Contest");
const Bet = require("../models/Bet");
const betService = require("../services/betService");
const { ObjectId } = require("mongodb");

const startBetting = async (req, res) => {

    try {
        user = req.user;
        const { entryFee, betType, picks } = req.body;
        jsonArray = JSON.parse(picks);
        jsonArray.forEach(element => {
            element.playerId = new ObjectId(element.playerId);
            element.contestId = new ObjectId(element.contestId);
        });

        const myBet = new Bet({
            userId: new ObjectId(user.id),
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