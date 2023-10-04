const Contest = require('../models/Contest');
const User = require('../models/User');
require('../utils/log');
const {
  ObjectId
} = require('mongodb');
const {
  fetchNBAContest,
  fetchGameSummary,
  FinalizeBet,
  fetchNFLContest
} = require('../services/contestService');
const teamController = require('../controllers/teamController')
const Player = require('../models/Player');
const Bet = require('../models/Bet');
const {
  addPrizeTransaction
} = require('../controllers/transactionController');
const { updateCapital } = require('../controllers/capitalController');

const { USD2Ether } = require('../utils/util');
const {
  BET_2_2_HIGH,
  BET_3_3_HIGH,
  BET_2_3_LOW,
  BET_3_3_LOW,
  BET_3_4_LOW,
  BET_4_4_HIGH,
  BET_3_5_LOW,
  BET_4_5_LOW,
  BET_5_5_LOW,
  BET_4_6_LOW,
  BET_5_6_LOW,
  BET_6_6_LOW
} = require('../config/constant');


const addNBAContestsToDatabase = async (req, res) => {
  try {
    // Fetch contest data from the Sportradar NBA API

    const contestData = await fetchNBAContest("2023/REG");

    // Loop through the fetched data and add contests to the database
    for (const contestInfo of contestData) {
      const homeID = await teamController.getIdfromRemoteId(contestInfo.home.id);
      const awayID = await teamController.getIdfromRemoteId(contestInfo.away.id);

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
    console.log(error);
    //throw new Error(`Error adding NBA contests to the database: ${error.message}`);
  }
};

const addNFLContestsToDatabase = async (req, res) => {
  try {
    const weeks = await fetchNFLContest("2023/REG");

    // Loop through the fetched data and add contests to the database
    for (const week of weeks) {
      for (const contestInfo of week.games) {
        const homeID = await teamController.getIdfromRemoteId(contestInfo.home.id);
        const awayID = await teamController.getIdfromRemoteId(contestInfo.away.id);

        const contest = new Contest({
          name: contestInfo.home.alias + " vs " + contestInfo.away.alias,
          season: "2023/REG",
          startTime: new Date(contestInfo.scheduled),
          sportId: new ObjectId("650e0b6fb80ab879d1c142c8"),
          remoteId: contestInfo.id,
          teams: [homeID, awayID]
        });
        await contest.save();
      }
    }
    res.json({
      message: 'NFL contests added to the database.'
    });
    //res.json(weeks);
  } catch (error) {
    throw new Error(`Error adding NFL contests to the database: ${error.message}`);
  }
}


const preprocessPlayers = async (players) => {
  const playerList = [];
  for (let play of players) {
    const t = play;
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
const updateBetfromContest = async (gameId) => {
  try {
    const summary = await FinalizeBet(gameId);
    if (summary.home.players.length > 0) {
      const players = summary.home.players; //.concat(summary.away.players);
      const playerList = await preprocessPlayers(players);
      const contest = await Contest.findOne({
        remoteId: summary.id
      });
      const contestId = contest._id;

      const pendingBets = await Bet.find({
        'picks.contestId': contestId
      });

      for (const pending of pendingBets) {
        let finished = 0,
          win = 0;

        for (const pick of pending.picks) {
          if (pick.contestId.equals(contestId)) {
            const player = playerList.find(player => player.oid.equals(pick.playerId));
            if (player) {
              pick.result = player.statistics[pick.prop.propName];
              pending.picks[pending.picks.indexOf(pick)] = pick;
            }
          }
          if (pick.result) {
            finished += 1;
            if (pick.overUnder == "over" && pick.result > pick.prop.odds ||
              pick.overUnder == "under" && pick.result < pick.prop.odds) {
              win += 1;
            }
          }
        }
        if (finished == pending.picks.length) {
          switch (finished) {
            case 2:
              if (win == 2) {
                pending.prize = pending.entryFee * BET_2_2_HIGH;
                pending.status = "win"
              } else {
                pending.prize = 0;
                pending.status = "lost"
              }
              break;
            case 3:
              switch (win) {
                case 2:
                  if (pending.betType.equals("high")) {
                    pending.prize = 0;
                    pending.status = "lost"
                  } else {
                    pending.prize = pending.entryFee * BET_2_3_LOW;
                    pending.status = "win"
                  }
                  break;
                case 3:
                  if (pending.betType.equals("high"))
                    pending.prize = pending.entryFee * BET_3_3_HIGH;
                  else
                    pending.prize = pending.entryFee * BET_3_3_LOW;
                  pending.status = "win"
                  break;
                default:
                  pending.prize = 0;
                  pending.status = "lost"
                  break;
              }
              break;
            case 4:
              switch (win) {
                case 3:
                  if (pending.betType.equals("high")) {
                    pending.prize = 0;
                    pending.status = "lost"
                  } else {
                    pending.prize = pending.entryFee * BET_3_4_LOW;
                    pending.status = "win"
                  }
                  break;
                case 4:
                  if (pending.betType.equals("high"))
                    pending.prize = pending.entryFee * BET_4_4_HIGH;
                  else
                    pending.prize = pending.entryFee * BET_4_4_LOW;
                  pending.status = "win"
                  break;
                default:
                  pending.prize = 0;
                  pending.status = "lost"
                  break;
              };
              break;
            case 5:
              switch (win) {
                case 3:
                  if (pending.betType.equals("high")) {
                    pending.prize = 0;
                    pending.status = "lost"
                  } else {
                    pending.prize = pending.entryFee * BET_3_5_LOW;
                    pending.status = "win"
                  }
                  break;
                case 4:
                  if (pending.betType.equals("high")) {
                    pending.prize = 0;
                    pending.status = "lost"
                  } else {
                    pending.prize = pending.entryFee * BET_4_5_LOW;
                    pending.status = "win"
                  }
                  break;
                case 5:
                  if (pending.betType.equals("high")) {
                    pending.prize = 0;
                    pending.status = "lost"
                  } else {
                    pending.prize = pending.entryFee * BET_5_5_LOW;
                    pending.status = "win"
                  }
                  break;
                default:
                  pending.prize = 0;
                  pending.status = "lost";
                  break;
              }
              break;
            case 6:
              switch (win) {
                case 4:
                  if (pending.betType.equals("high")) {
                    pending.prize = 0;
                    pending.status = "lost"
                  } else {
                    pending.prize = pending.entryFee * BET_4_6_LOW;
                    pending.status = "win"
                  }
                  break;
                case 5:
                  if (pending.betType.equals("high")) {
                    pending.prize = 0;
                    pending.status = "lost"
                  } else {
                    pending.prize = pending.entryFee * BET_5_6_LOW;
                    pending.status = "win"
                  }
                  break;
                case 6:
                  if (pending.betType.equals("high")) {
                    pending.prize = 0;
                    pending.status = "lost"
                  } else {
                    pending.prize = pending.entryFee * BET_6_6_LOW;
                    pending.status = "win"
                  }
                  break;
                default:
                  pending.prize = 0;
                  pending.status = "lost"
                  break;
              }
              break;
            default:
              break;
          }
          if (pending.status == 'win') {
            await addPrizeTransaction(pending.userId, pending.prize);
            const user = await User.findById(pending.userId);
            if (user) {
              user.wins += 1;
            }
            await user.save();
            await updateCapital(3, await USD2Ether(pending.prize - pending.entryFee));
          } else {
            await updateCapital(2, await USD2Ether(pending.entryFee));
          }
        }
        await pending.save();
      };
    }
  } catch (error) {
    console.log(error);
  }
}
module.exports = {
  addNBAContestsToDatabase,
  updateBetfromContest,
  addNFLContestsToDatabase
};