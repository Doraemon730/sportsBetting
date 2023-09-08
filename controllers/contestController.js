const Contest = require('../models/Contest');
const User = require('../models/User');
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
const { defaultMaxListeners } = require('nodemailer/lib/xoauth2');
const LOW_PRIZE = process.env.BET_LOW_PRIZE;
const HIGH_PRIZE = process.env.BET_HIGH_PRIZE;
const BET_2_2_HIGH = process.env.BET_2_2_HIGH
const BET_3_3_HIGH = process.env.BET_3_3_HIGH
const BET_2_3_LOW = process.env.BET_2_3_LOW;
const BET_3_3_LOW = process.env.BET_3_3_LOW;
const BET_4_4_HIGH = process.env.BET_4_4_HIGH;
const BET_3_4_LOW = process.env.BET_3_4_LOW;
const BET_4_4_LOW = process.env.BET_4_4_LOW;
const BET_3_5_LOW = process.env.BET_3_5_LOW;
const BET_4_5_LOW = process.env.BET_4_5_LOW;
const BET_5_5_LOW = process.env.BET_5_5_LOW;
const BET_4_6_LOW = process.env.BET_4_6_LOW;
const BET_5_6_LOW = process.env.BET_4_6_LOW;
const BET_6_6_LOW = process.env.BET_4_6_LOW;

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

      for (const pending of pendingBets) {
        let finished = 0, win = 0;
        //pending.picks.forEach(async pick => {
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
          switch(finished){
            case 2:
              if(win == 2) {
                pending.prize = pending.entryFee * BET_2_2_HIGH;
                pending.status = "win"
              } else {
                pending.prize = 0;
                pending.status = "lost"
              }             
              break;
            case 3:
              switch(win){
                case 2:
                  pending.prize = pending.entryFee * BET_2_3_LOW;
                  pending.status = "win"
                  break;
                case 3:
                  if(pending.betType.equals("high"))
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
              switch(win) {
                case 3:
                  pending.prize = pending.entryFee * BET_3_4_LOW;
                  pending.status = "win"
                  break;
                case 4:
                  if(pending.betType.equals("high"))
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
              switch(win) {
                case 3:
                  pending.prize = pending.entryFee * BET_3_5_LOW;
                  pending.status = "win"
                  break;
                case 4:
                    pending.prize = pending.entryFee * BET_4_5_LOW;
                    pending.status = "win"
                    break;
                case 5:
                  pending.prize = pending.entryFee * BET_5_5_LOW;
                  pending.status = "win"
                  break;
                defaut:
                  pending.prize = 0;
                  pending.status = "lost";
                  break;
              }              
              break;
            case 6: 
            switch(win) {
              case 4:
                pending.prize = pending.entryFee * BET_4_6_LOW;
                pending.status = "win"
                break;
              case 5:
                  pending.prize = pending.entryFee * BET_5_6_LOW;
                  pending.status = "win"
                  break;
              case 6:
                pending.prize = pending.entryFee * BET_6_6_LOW;
                pending.status = "win"
                break;
              defaut:
                pending.prize = 0;
                pending.status = "lost"
                break;
            }               
              break;
            default:              
              break;
          }
          if (pending.status == 'win') {
            const user = await User.findById(pending.userId);
            if(user){
              user.wins += 1;
              if(user.level <= 33)
                user.level ++;
              else if(user.level <= 66){
                if(user.wins % 2 == 0)
                  user.level ++;
              } else {
                if(user.wins % 3 == 0)
                  user.level ++;
              }              
              await user.save();              
            }
          }
        }
        
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