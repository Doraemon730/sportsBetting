const Contest = require("../models/Contest");
const Player = require("../models/Player");
// const Sport = require("../models/Sport");
const { fetchPlayerNumber, fetchPlayerProfile } = require("../services/playerService");
const { fetchNBATeamsFromRemoteId } = require("../services/teamService");
const { getAllTeamsFromDatabase } = require("./teamController");


const getPlayersByProps = async (req, res) => {
  // try {
  const { sportName, propName } = req.body;

  // const sport = await Sport.findOne({ name: sportName });
  // if (!sport) {
  //   return res.status(404).json({ message: 'Sport not found' });
  // }

  const now = new Date();
  const threeDaysFromNow = new Date(now.getTime() + 32 * 24 * 60 * 60 * 1000);

  try {
    const results = await Contest.aggregate([
      {
        $lookup: {
          from: 'sports', // The name of the Sport collection in your database
          localField: 'sportId',
          foreignField: '_id',
          as: 'sport',
        },
      },
      {
        $unwind: '$sport',
      },
      {
        $match: {
          startTime: { $gte: now, $lte: threeDaysFromNow },
          'sport.name': sportName,
        },
      },
      {
        $unwind: '$teams',
      },
      {
        $lookup: {
          from: 'players',
          localField: 'teams',
          foreignField: 'teamId',
          as: 'contestPlayer',
        },
      },
      {
        $unwind: '$contestPlayer',
      },
      {
        $lookup: {
          from: 'sports',
          localField: 'contestPlayer.sportId',
          foreignField: '_id',
          as: 'sportInfo',
        },
      },
      {
        $lookup: {
          from: 'teams',
          localField: 'contestPlayer.teamId',
          foreignField: '_id',
          as: 'teamInfo',
        },
      },
      { $match: { [`contestPlayer.statistics.${propName}`]: { $exists: true } } },
      {
        $addFields: {
          contestId: '$_id',
          contestName: '$name', // Add the contestName field from Contest collection
        },
      },
      {
        $project: {
          _id: 0,
          playerId: '$contestPlayer._id',
          playerName: '$contestPlayer.name',
          contestId: 1,
          contestName: 1,
          playerNumber: '$contestPlayer.jerseyNumber',
          sportName: { $arrayElemAt: ['$sportInfo.name', 0] },
          teamName: { $arrayElemAt: ['$teamInfo.name', 0] },
          statistics: '$contestPlayer.statistics',
        },
      },
    ]);
    // console.log(results.length);
    results.sort((a, b) => b.statistics[propName] - a.statistics[propName])
    res.json(results);
  } catch (err) {
    res.status(500).json({ message: err.message })
  }

  // const upcomingContests = await Contest.find({
  //   startTime: { $gte: now, $lt: threeDaysFromNow },
  //   sportId: sport._id
  // })
  // if (!upcomingContests) {
  //   return res.json({})
  // }
  // const players = [];
  // for (const contest of upcomingContests) {
  //   const playersInContest = await Player.find({
  //     'teamId': { $in: contest.teams },
  //     [`statistics.${propName}`]: { $exists: true }
  //   });
  //   playersInContest.forEach(contestPlayer => {
  //     const player = {
  //       contestPlayer,
  //       contestStartTime: contest.startTime,
  //       contestName: contest.name
  //     }
  //     players.push(player);
  //   });
  // }

  // } catch (err) {
  //   res.status(500).json({ message: err.message })
  // }
}
const getPlayerById = async (playerId) => {
  try {
    const player = await Player.findById(playerId).populate('teamId', 'name'); // Use .populate() to populate team data
    if (!player) {
      throw new Error('Player not found');
    }
    return player;
  } catch (error) {
    console.log(error.message);
    //throw new Error(`Error getting player by ID: ${error.message}`);
  }
};
const updateNBAPlayers = async () => {
  try {
    const players = await Player.find({});
    for (const player of players) {
      if (!player.jerseyNumber) {
        const playerNumber = await fetchPlayerNumber(player.remoteId);
        if (playerNumber) {
          player.jerseyNumber = playerNumber;
          await player.save();
        }
      }
    }
  } catch (error) {
    console.log(error.message);
  }
}
const addNBAPlayersToDatabase = async (req, res) => {
  try {
    // Fetch contest data from the Sportradar NBA API

    const teams = await getAllTeamsFromDatabase();


    // Loop through the fetched data and add contests to the database
    for (const team of teams) {

      const remoteteam = await fetchNBATeamsFromRemoteId(team.remoteId);
      //console.log(remoteteam);
      for (const player of remoteteam.players) {
        const playerProfile = await fetchPlayerProfile(player.id);
        console.log(playerProfile);
        if (playerProfile) {
          const newPlayer = new Player({
            name: player.full_name,
            sportId: new ObjectId("64f78bc5d0686ac7cf1a6855"),
            remoteId: player.id,
            teamId: team._id,
            position: player.position,
            statistics: playerProfile.average
          });
          await newPlayer.save();
        }
      }
    }
    res.status(200).json({ message: 'NBA players added to the database.' });
    console.log('NBA Players added to the database.');
  } catch (error) {
    throw new Error(`Error adding NBA contests to the database: ${error.message}`);
  }
};

module.exports = { getPlayersByProps, addNBAPlayersToDatabase, updateNBAPlayers };
