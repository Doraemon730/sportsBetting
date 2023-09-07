const Contest = require('../models/Contest');
const {ObjectId} = require('mongodb');
const {fetchNBAContest, fetchGameSummary, FinalizeBet} = require('../services/contestService')

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
      res.json({message: 'NBA contests added to the database.'});
    } catch (error) {
      throw new Error(`Error adding NBA contests to the database: ${error.message}`);
    }
  };
  
const preprocessPlayers = async (players) => {
    const playerList = [];
    for(let play of players) {
        const t = play;
        const p = Player.findOne({remoteId: play.id});
        t.oid = new ObjectId(p._id);
        playerList.push(t);
    }
    return playerList;
}
const updateBetfromContest = async () => {
    try {
        const summary = await FinalizeBet();
        if(summary.home.players.length > 0) {
        const players = summary.home.players.concat(summary.away.players);
        const playerList = await preprocessPlayers(players);
        console.log(playerList);
        const contestID = Contest.findOne({remoteId: summary.id})._id;

        Bet.aggregate([
            {
              $match: {
                'picks.contestId': contestID,
                status: 'pending',
              },
            },
            {
              $unwind: '$picks',
            },
            {
              $lookup: {
                from: { $literal: playerList }, // Use the playerList array
                localField: 'picks.playerId',
                foreignField: '_id',
                as: 'player',
              },
            },
            {
              $unwind: '$player',
            },
            {
              $addFields: {
                'playerStatistic': {
                  $ifNull: [
                    { $arrayElemAt: ['$player.statistics.' + '$picks.prop.propName', 0] },
                    0,
                  ],
                },
              },
            },
            {
              $addFields: {
                'prize': {
                  $cond: [
                    {
                      $or: [
                        { $and: [{ $eq: ['$picks.overUnder', 'over'] }, { $gt: [`$playerStatistic[$picks.prop.propName]`, '$picks.prop.odds'] }] },
                        { $and: [{ $eq: ['$picks.overUnder', 'under'] }, { $lt: ['$playerStatistic[$picks.prop.propName]', '$picks.prop.odds'] }] },
                      ],
                    },
                    { $add: ['$prize', 20] },
                    '$prize',
                  ],
                },
              },
            },
            {
              $group: {
                _id: '$_id',
                userId: { $first: '$userId' },
                entryFee: { $first: '$entryFee' },
                betType: { $first: '$betType' },
                picks: { $push: '$picks' },
                status: { $first: '$status' },
                prize: { $first: '$prize' },
              },
            },
          ]).then((bets) => {
            console.log('Updated bets:', bets);
          })
          .catch((err) => {
            console.error('Error:', err);
          });
        }
    } catch (error) {
        console.log(error.message);
    }
}
  module.exports = { addNBAContestsToDatabase, updateBetfromContest};