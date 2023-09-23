const Contest = require("../models/Contest");
const Player = require("../models/Player");
const Discount = require("../models/Discount");
const Event = require('../models/Event');
const Prop = require('../models/Prop');
const {
  ObjectId
} = require("mongodb");
// const Sport = require("../models/Sport");
const {
  fetchPlayerNumber,
  fetchPlayerProfile
} = require("../services/playerService");
const {
  fetchNBATeamsFromRemoteId,
  fetchNFLTeamsFromRemoteId
} = require("../services/teamService");
const {
  getAllTeamsFromDatabase,
} = require("./teamController");

const getTopPlayerBy = async (req, res) => {
  try {
    let {
      sportId
    } = req.body;

    if (!sportId) {
      return res.status(400).json({
        message: "sportId is required"
      });
    }

    sportId = new ObjectId(sportId);
    const props = await Prop.find({
      sportId: sportId
    }).select('_id displayName');
    if (props.length == 0)
      return res.status(404).json("There is not props");
    const result = {};
    result.props = props.map((prop) => prop.displayName);



    const now = new Date();
    const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);


    const players = await Player.aggregate(
      [{
        $unwind: '$odds' // Unwind the odds array to work with individual odds documents
      },
      {
        $sort: {
          'odds.value': -1 // Sort by odds.value in descending order
        }
      },
      {
        $lookup: {
          from: 'props', // Replace with the actual name of your 'props' collection
          localField: 'odds.id',
          foreignField: '_id',
          as: 'prop'
        }
      },
      {
        $unwind: '$prop' // Unwind the 'prop' array created by the lookup
      },
      {
        $lookup: {
          from: 'teams', // Replace with the actual name of your 'props' collection
          localField: 'teamId',
          foreignField: '_id',
          as: 'team'
        }
      },
      {
        $unwind: '$team' // Unwind the 'prop' array created by the lookup
      },
      {
        $lookup: {
          from: 'events',
          localField: 'odds.event',
          foreignField: '_id',
          as: 'event'
        }
      },
      {
        $unwind: '$event'
      },
      {
        $group: {
          _id: '$odds.id', // Group by odds.id
          players: {
            $push: {
              playerId: '$_id',
              playerName: '$name',
              playerPosition: '$position',
              contestId: '$odds.event',
              playerNumber: '$jerseyNumber',
              headshot: '$headshot',
              odds: '$odds.value',
              teamName: '$team.alias',
              contestName: '$event.name',
              contestStartTime: '$event.startTime',
            }
          }
        }
      },
      {
        $project: {
          topPlayers: '$players'
          // {
          //   $slice: ['$players', 10] // Get the top 10 players for each odds.id group
          // }
        }
      }
      ]);
    for (const prop of props) {

      result[prop.displayName] = players.filter(player => String(player._id) === String(prop._id))[0].topPlayers;
      console.log(prop.displayName, result[prop.displayName].length);
    }

    res.status(200).json(result);
  } catch (error) {
    console.log(error);
    res.status(500).send('Server error');
  }
}
const getTopPlayerBySport = async (req, res) => {
  try {
    let {
      sportId
    } = req.body;

    if (!sportId) {
      return res.status(400).json({
        message: "sportId is required"
      });
    }

    sportId = new ObjectId(sportId);
    const props = await Prop.find({
      sportId: sportId
    });
    if (props.length == 0)
      return res.status(404).json("There is not props");
    const result = {};
    result.props = props;




    const now = new Date();
    const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

    const results = await Contest.aggregate([
      {
        $match: {
          sportId: sportId,
          startTime: {
            $gte: now,
            $lte: threeDaysFromNow
          }
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
          from: 'teams',
          localField: 'contestPlayer.teamId',
          foreignField: '_id',
          as: 'teamInfo',
        },
      },
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
          contestId: '$_id',
          contestName: '$name',
          contestStartTime: '$startTime',
          playerNumber: '$contestPlayer.jerseyNumber',
          playerPosition: '$contestPlayer.position',
          teamName: {
            $arrayElemAt: ['$teamInfo.name', 0]
          },
          statistics: '$contestPlayer.statistics',
        },
      },
    ]);

    for (const prop of props) {
      results.sort((a, b) => b.statistics[prop.name] - a.statistics[prop.name]);
      result[prop.name] = results.slice(0, 10);
    }
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json(error.message);
  }
}
const getPlayersByProps = async (req, res) => {
  const {
    sportName,
    propName
  } = req.body;
  const now = new Date();
  const threeDaysFromNow = new Date(now.getTime() + 32 * 24 * 60 * 60 * 1000);

  try {
    const results = await Contest.aggregate([{
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
        startTime: {
          $gte: now,
          $lte: threeDaysFromNow
        },
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
    {
      $match: {
        [`contestPlayer.statistics.${propName}`]: {
          $exists: true
        }
      }
    },
    {
      $addFields: {
        contestId: '$_id',

        seanson: '$season' // Add the contestName field from Contest collection
      },
    },
    {
      $project: {
        _id: 0,
        playerId: '$contestPlayer._id',
        playerName: '$contestPlayer.name',
        contestId: 1,

        season: 1,
        playerNumber: '$contestPlayer.jerseyNumber',
        sportName: {
          $arrayElemAt: ['$sportInfo.name', 0]
        },
        teamName: {
          $arrayElemAt: ['$teamInfo.name', 0]
        },
        statistics: '$contestPlayer.statistics',
      },
    },
    ]);

    results.sort((a, b) => b.statistics[propName] - a.statistics[propName]);

    if (now.getDay() === 0) {
      now.setUTCHours(0, 0, 0, 0);
      results = results.map(async (player) => {

        let discountPlayer = await Discount.find({
          date: now,
          playerId: player.playerId
        }).populate('prop');
        if (!discountPlayer)
          return player;
        player.statistics[discountPlayer.prop.name] = discountPlayer.discount;
        return player;
      });
    }

    res.json(results);
  } catch (err) {
    res.status(500).send('Server error');
  }
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
const addNFLPlayersToDatabase = async (req, res) => {
  try {
    const teams = await getAllTeamsFromDatabase(new ObjectId("650e0b6fb80ab879d1c142c8"));
    for (const team of teams) {

      const remoteteam = await fetchNFLTeamsFromRemoteId(team.remoteId);
      for (const player of remoteteam.players) {
        const newPlayer = new Player({
          name: player.name,
          sportId: new ObjectId("650e0b6fb80ab879d1c142c8"),
          remoteId: player.id,
          teamId: team._id,
          position: player.position,
          jerseyNumber: player.jersey,
          srId: player.sr_id
        });
        await newPlayer.save();
      }
    }
    res.status(200).json({
      message: 'NFL players added to the database.'
    });

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
      for (const player of remoteteam.players) {
        const playerProfile = await fetchPlayerProfile(player.id);
        if (playerProfile) {
          const newPlayer = new Player({
            name: player.full_name,
            sportId: new ObjectId("64f78bc5d0686ac7cf1a6855"),
            remoteId: player.id,
            teamId: team._id,
            position: player.position,
            statistics: playerProfile.average,
            srId: playerProfile.sr_id
          });
          await newPlayer.save();
        }
      }
    }
    res.status(200).json({
      message: 'NBA players added to the database.'
    });
  } catch (error) {
    throw new Error(`Error adding NBA contests to the database: ${error.message}`);
  }
};

const getPlayerProp = async (req, res) => {
  try {
    let {
      id
    } = req.body;
    const player = await Player.findById(new ObjectId(id));
    if (player)
      res.json(player.statistics);
    else
      res.status(404).json("Player not found");
  } catch (error) {
    res.status(500).send('Server error');
  }
}

module.exports = {
  getPlayersByProps,
  addNBAPlayersToDatabase,
  updateNBAPlayers,
  getPlayerProp,
  getTopPlayerBySport,
  addNFLPlayersToDatabase,
  getTopPlayerBy
};