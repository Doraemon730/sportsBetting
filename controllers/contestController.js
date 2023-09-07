const Contest = require('../models/Contest');
const {
  ObjectId
} = require('mongodb');
const {
  fetchNBAContest,
  fetchGameSummary,
  FinalizeBet
} = require('../services/contestService')
const Player = require('../models/Player');
const Bet = require('../models/Bet');
const LOW_PRIZE = process.env.BET_LOW_PRIZE;
const HIGH_PRIZE = process.env.BET_HIGH_PRIZE;

const addNBAContestsToDatabase = async (req, res) => {
  try {
    // Fetch contest data from the Sportradar NBA API

    const contestData = await fetchNBAContest("2023/REG");

    //console.log(contestData);
    // Loop through the fetched data and add contests to the database
    for (const contestInfo of contestData) {
      const homeID = await teamService.getIdfromRemoteId(contestInfo.home.id);
      const awayID = await teamService.getIdfromRemoteId(contestInfo.away.id);

      console.log(homeID, awayID);
      const contest = new Contest({
        name: contestInfo.home.alias + " vs " + contestInfo.away.alias,
        season: "2023/REG",
        startTime: new Date(contestInfo.scheduled),
        sportId: new ObjectId("64f78bc5d0686ac7cf1a6855"),
        remoteId: contestInfo.id,
        teams: [homeID, awayID]
      });
      await contest.save();
    }
    res.json({
      message: 'NBA contests added to the database.'
    });
  } catch (error) {
    throw new Error(`Error adding NBA contests to the database: ${error.message}`);
  }
};

const preprocessPlayers = async (players) => {
  const playerList = [];
  for (let play of players) {
    const t = play;
    //console.log(play);
    const p = await Player.findOne({
      remoteId: play.id
    });
    if (p) {
      t.oid = p._id;
      playerList.push(t);
    }
  }
  return playerList;
}
const updateBetfromContest = async () => {
  try {
    const summary = await FinalizeBet();
    if (summary.home.players.length > 0) {
      const players = summary.home.players; //.concat(summary.away.players);
      const playerList = await preprocessPlayers(players);
      //console.log(playerList.map(player => player.oid));
      const contest = await Contest.findOne({
        remoteId: summary.id
      });
      const contestId = contest._id;

      const pendingBets = await Bet.find({
        'picks.contestId': contestId
      });

      //pendingBets.forEach(async pending => {
      for (const pending of pendingBets) {
        let finished = 0,
          win = 0;
        //pending.picks.forEach(async pick => {
        for (const pick of pending.picks) {
          if (pick.contestId.equals(contestId)) {
            const player = playerList.find(player => player.oid.equals(pick.playerId));
            if (player) {
              pick.result = player.statistics[pick.prop.propName];
              console.log(pick.result);
              console.log(pick);
              pending.picks[pending.picks.indexOf(pick)] = pick;
              // await pick.save({ suppressWarning: true });
            }
            if (pick.result) {
              finished += 1;
              if (pick.overUnder == "over" && pick.result > pick.prop.odds ||
                pick.overUnder == "under" && pick.result < pick.prop.odds) {
                win += 1;
              }
            }

          }
        }
        if (finished == pending.picks.length) {
          if (finished == win && pending.betType.equals("high")) {
            pending.status = "win";
            pending.prize = HIGH_PRIZE * pending.entryFee;
          }
          else if (finished - win < 2) {
            pending.status = "win";
            pending.prize = LOW_PRIZE * pending.entryFee;
          } else {
            pending.status = "lost";
            pending.prize = 0;
          }

        }
        console.log(pending.picks[0].prop);
        await pending.save();

      };

      console.log("ends");

    }
  } catch (error) {
    console.log(error.message);
  }
}
module.exports = {
  addNBAContestsToDatabase,
  updateBetfromContest
};