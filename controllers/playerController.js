const Contest = require("../models/Contest");
const Player = require("../models/Player");
const Team = require('../models/Team');
const Discount = require("../models/Discount");
const Event = require('../models/Event');
const Prop = require('../models/Prop');
const fs = require('fs');
const Path = require('path');
require('../utils/log');
const {
  ObjectId
} = require("mongodb");
// const Sport = require("../models/Sport");
const {
  fetchPlayerNumber,
  fetchPlayerProfile,
  fetchPlayerManifest,
  fetchPlayerImage,
  fetchMLBPlayerNumber,
  fetchImageFromPrize,
  fetchNBAPlayersFromGoal,
  fetchNFLPlayersFromGoal,
  fetchNHLPlayersFromGoal
} = require("../services/playerService");
const {
  fetchNBATeamsFromRemoteId,
  fetchNFLTeamsFromRemoteId,
  fetchNHLTeamsFromRemoteId,
  fetchMLBTeamsFromRemoteId,
  fetchCFBTeamsFromRemoteId
} = require("../services/teamService");
const {
  getAllTeamsFromDatabase,
} = require("./teamController");
const { confirmArray } = require("../utils/util");

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
    // if (sportId == "64f78bc5d0686ac7cf1a6855")
    //   return res.res.status(404).json("There is not props");

    sportId = new ObjectId(sportId);
    let props = await Prop.find({
      sportId: sportId,
      available: true
    }).select('_id displayName');
    if (props.length == 0)
      return res.status(404).json("There is not props");
    const result = {};




    const now = new Date();
    const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

    let players;

    players = await Player.aggregate(
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
        $unwind: {
          path: '$prop',
          preserveNullAndEmptyArrays: true
        } // Unwind the 'prop' array created by the lookup
      },
      {
        $match: {
          'prop.available': true
        }
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
        $unwind: {
          path: '$team', // Unwind the 'prop' array created by the lookup
          preserveNullAndEmptyArrays: true
        }
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
        $match: {
          'event.startTime': {
            $gte: new Date(),
          }
        }
      },
      {
        $group: {
          _id: '$odds.id', // Group by odds.id
          players: {
            $push: {
              playerId: '$_id',
              playerName: '$name',
              remoteId: '$remoteId',
              gId: '$gId',
              sportType: '$sportType',
              playerPosition: '$position',
              contestId: '$odds.event',
              playerNumber: '$jerseyNumber',
              headshot: '$headshot',
              odds: '$odds.value',
              teamName: { $ifNull: ['$team.alias', '$teamName'] },
              teamId: '$teamId',
              contestName: '$event.name',
              contestStartTime: '$event.startTime',
              overUnder: "over",
              propId: '$prop._id',
              propName: '$prop.displayName'
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

    //console.log(JSON.stringify(players));
    //props = props.filter(item => item.displayName !== "Hits Allowed" && item.displayName !== "Pitching Outs");
    //props = props.filter(item => item.displayName !== "Total Hits");
    let tackles = ["DE", "DL", "LE", "RE", "DT", "NT", "LB", "MLB", "ILB", "OLB", "LOLB", "ROLB", "SLB", "WLB", "DB", "CB", "S", "SS", "FS"];
    result.props = props.map((prop) => prop.displayName);
    for (const prop of props) {
      const playersToBet = players.filter(player => String(player._id) === String(prop._id))[0];
      result[prop.displayName] = playersToBet ? playersToBet.topPlayers : [];
      result[prop.displayName].sort((a, b) => a.contestStartTime - b.contestStartTime);
      now.setHours(0, 0, 0, 0);
      result[prop.displayName] = await Promise.all(result[prop.displayName].map(async (player) => {
        let discountPlayer = await Discount.findOne({
          date: now,
          playerId: player.playerId,
          propName: prop.displayName
        }).populate('propId');
        if (!discountPlayer) {
          return player;
        }
        player.originalOdds = player.odds
        player.odds = discountPlayer.discount;
        return player;
      }));
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
    // if(sportId == "64f78bc5d0686ac7cf1a6855")
    //   return res.status(404).json("There is not props");
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

const getImage = async (req, res) => {
  try {
    let { fileName } = req.body;
    await fetchImageFromPrize(fileName);
    res.json("success");
  } catch (error) {
    console.log(error);
  }
}

const setNBAImage = async (req, res) => {
  try {
    let players = await Player.find({ sportId: new ObjectId('64f78bc5d0686ac7cf1a6855') });
    for (let player of players) {
      let name = player.name.replace(' ', '_');
      let fileName = name + "_" + player.remoteId + ".webp";
      let path = Path.resolve(__dirname, '../public/images', fileName);
      console.log(path);
      if (fs.existsSync(path)) {
        console.log("File Exist");
        player.headshot = fileName;
        await player.save();
      }
      else
        console.log("not Found");
    }
    res.json("Success");
  } catch (error) {
    console.log(error);
  }
}

const setNHLImage = async (req, res) => {
  try {
    let players = await Player.find({ sportId: new ObjectId('65108faf4fa2698548371fbd') });
    for (let player of players) {
      let name = player.name.replace(' ', '_');
      let fileName = name + "_" + player.remoteId + ".webp";
      let path = Path.resolve(__dirname, '../public/images', fileName);
      console.log(path);
      if (fs.existsSync(path)) {
        console.log("File Exist");
        player.headshot = fileName;
        await player.save();
      }
      else
        console.log("not Found");
    }
    res.json("Success");
  } catch (error) {
    console.log(error);
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

    //if (now.getDay() === 0) {
    now.setUTCHours(0, 0, 0, 0);
    results = results.map(async (player) => {

      console.log(now);
      let discountPlayer = await Discount.find({
        date: now,
        playerId: player.playerId
      }).populate('prop');
      if (!discountPlayer)
        return player;
      player.statistics[discountPlayer.prop.name] = discountPlayer.discount;
      return player;
    });
    //}

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
    console.log(error);
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
    console.log(error);
  }
}

const updateNFLPlayers = async (req, res) => {
  try {
    const players = await Player.find({ sportId: new ObjectId('650e0b6fb80ab879d1c142c8') });
    for (const player of players) {
      if (player.headshot) {
        player.headshot = player.headshot + ".png";
        await player.save();
      }
    }
    res.json("success");
  } catch (error) {
    console.log(error);
  }
}

const addSoccerPlayer = async (req, res) => {
  try {
    const { name, teamId, position, jerseyNumber, srId, teamName, headshot } = req.body;
    const newPlayer = new Player({
      sportId: new ObjectId('65131974db50d0c2c8bf7aa7'),
      teamId: new ObjectId(teamId),
      name,
      position,
      jerseyNumber,
      srId,
      teamName,
      headshot
    });
    const result = await newPlayer.save();
    res.json(result);
  } catch (error) {
    console.log(error);
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
    console.log(error);

  }
}

const addCFBPlayersToDatabase = async (req, res) => {
  try {
    const teams = await getAllTeamsFromDatabase(new ObjectId("652f31fdfb0c776ae3db47e1"));
    for (const team of teams) {

      const remoteteam = await fetchCFBTeamsFromRemoteId(team.remoteId);
      console.log(remoteteam);
      for (const player of remoteteam.players) {
        const newPlayer = new Player({
          name: player.name,
          sportId: new ObjectId("652f31fdfb0c776ae3db47e1"),
          remoteId: player.id,
          teamId: team._id,
          position: player.position,
          jerseyNumber: player.jersey,
        });
        await newPlayer.save();
      }
    }
    res.status(200).json({
      message: 'CFB players added to the database.'
    });

  } catch (error) {
    console.log(error);
    res.status(500).send("Server Error");
  }
}
const addNHLPlayersToDatabase = async (req, res) => {
  try {
    const teams = await getAllTeamsFromDatabase(new ObjectId("65108faf4fa2698548371fbd"));
    for (const team of teams) {

      const remoteteam = await fetchNHLTeamsFromRemoteId(team.remoteId);
      for (const player of remoteteam.players) {
        const newPlayer = new Player({
          name: player.full_name,
          sportId: new ObjectId("65108faf4fa2698548371fbd"),
          remoteId: player.id,
          teamId: team._id,
          position: player.position,
          jerseyNumber: player.jersey_number,
          srId: player.sr_id
        });
        await newPlayer.save();
      }
    }
    res.status(200).json({
      message: 'NHL players added to the database.'
    });

  } catch (error) {
    console.log(error);
    res.status(500).send("Server Error");
  }
}
const addMLBPlayersToDatabase = async (req, res) => {
  try {
    const teams = await getAllTeamsFromDatabase(new ObjectId("65108fcf4fa2698548371fc0"));
    for (const team of teams) {

      const remoteteam = await fetchMLBTeamsFromRemoteId(team.remoteId);
      for (const player of remoteteam.players) {
        const newPlayer = new Player({
          name: player.full_name,
          sportId: new ObjectId("65108fcf4fa2698548371fc0"),
          remoteId: player.id,
          teamId: team._id,
          position: player.position,
          jerseyNumber: player.jersey_number,
        });
        await newPlayer.save();
      }
    }
    res.status(200).json({
      message: 'MLB players added to the database.'
    });

  } catch (error) {
    console.log(error);
    res.status(500).send("Server Error");
  }
}
const updateMLBPlayers = async () => {
  try {
    const players = await Player.find({ sportId: new ObjectId("65108fcf4fa2698548371fc0") });
    for (const player of players) {
      if (!player.jerseyNumber) {
        const playerNumber = await fetchMLBPlayerNumber(player.remoteId);
        if (playerNumber) {
          player.jerseyNumber = playerNumber;
          await player.save();
        }
      }
    }
    res.json("success");
  } catch (error) {
    console.log(error);
  }
}

const updateSoccerPlayers = async (req, res) => {
  try {
    const players = await Player.find({ sportId: new ObjectId("65131974db50d0c2c8bf7aa7") });

    for (const player of players) {
      console.log(player);
      player.remoteId = player.srId;
      await player.save();
    }
    res.json("success");
  } catch (error) {
    console.log(error);
  }
}
const addNBAPlayersToDatabase = async (req, res) => {
  try {
    // Fetch contest data from the Sportradar NBA API

    const teams = await getAllTeamsFromDatabase(new ObjectId('64f78bc5d0686ac7cf1a6855'));


    // Loop through the fetched data and add contests to the database
    for (const team of teams) {

      const remoteteam = await fetchNBATeamsFromRemoteId(team.remoteId);
      for (const player of remoteteam.players) {
        const newPlayer = new Player({
          name: player.full_name,
          sportId: new ObjectId("64f78bc5d0686ac7cf1a6855"),
          remoteId: player.id,
          teamId: team._id,
          position: player.position,
          srId: player.sr_id,
          jerseyNumber: player.jersey_number
        });
        await newPlayer.save();
      }
    }
    res.status(200).json({
      message: 'NBA players added to the database.'
    });
  } catch (error) {
    console.log(error);
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

const getPlayerManifest = async (req, res) => {
  try {
    const manifest = await fetchPlayerManifest();

    for (const asset of manifest.assetlist) {
      //console.log(asset.player_id);
      const player = await Player.findOne({ remoteId: asset.player_id });
      if (!player) continue;
      await fetchPlayerImage(asset.id, asset.player_id);
      player.headshot = asset.player_id;
      await player.save();
    }

    res.json(manifest);
  } catch (error) {
    console.log(error);
    res.status(500).send('Server error');
  }
}
const remove = async (req, res) => {
  await Player.deleteMany({ sportId: new ObjectId("65108fcf4fa2698548371fc0") });
  res.json("Success");
}

const resetOdds = async (req, res) => {
  await Player.updateMany({ sportId: new ObjectId('64f78bc5d0686ac7cf1a6855') }, { odds: [] });
  res.json("Success");
}


const updatePlayerFromGoal = async (req, res) => {
  try {
    const teams = await Team.find({ sportId: new ObjectId('64f78bc5d0686ac7cf1a6855') });
    for (let team of teams) {
      const gplayers = await fetchNBAPlayersFromGoal(team.gId);
      const splayers = await Player.find({ sportId: new ObjectId('64f78bc5d0686ac7cf1a6855'), teamId: team._id });
      console.log(team.name + ": " + splayers.length);
      for (let gplayer of gplayers) {
        let splayer = splayers.find((p) => p.name.includes(gplayer.name) || gplayer.name.includes(p.name));
        if (splayer) {
          splayer.gId = gplayer.id;
          splayer.name = gplayer.name;
          await splayer.save();
        } else {
          const nbaPlayer = new Player({
            name: gplayer.name,
            sportId: new ObjectId('64f78bc5d0686ac7cf1a6855'),
            teamId: team._id,
            position: gplayer.position,
            age: gplayer.age,
            jerseyNumber: gplayer.number,
            gId: gplayer.id
          });
          await nbaPlayer.save();
          console.log(JSON.stringify(nbaPlayer));
        }
      }
      console.log(splayers);
    }
    res.json('success');
  } catch (error) {
    console.log(error);
    res.status(500).send('Server error');
  }
}

const updateNFLPlayerFromGoal = async (req, res) => {
  try {
    const teams = await Team.find({ sportId: new ObjectId('650e0b6fb80ab879d1c142c8') });
    for (let team of teams) {
      const positions = await fetchNFLPlayersFromGoal(team.gId);
      let gplayers = [];
      for (let position of positions) {
        gplayers.push(...position.player);
      }
      const splayers = await Player.find({ sportId: new ObjectId('650e0b6fb80ab879d1c142c8'), teamId: team._id });
      console.log(team.name + ": " + splayers.length);
      for (let gplayer of gplayers) {
        let splayer = splayers.find((p) => p.name.includes(gplayer.name) || gplayer.name.includes(p.name));
        if (splayer) {
          splayer.gId = gplayer.id;
          splayer.position = gplayer.position;
          splayer.name = gplayer.name;
          await splayer.save();
        } else {
          const nbaPlayer = new Player({
            name: gplayer.name,
            sportId: new ObjectId('650e0b6fb80ab879d1c142c8'),
            teamId: team._id,
            position: gplayer.position,
            age: gplayer.age,
            jerseyNumber: gplayer.number,
            gId: gplayer.id
          });
          await nbaPlayer.save();
          console.log(JSON.stringify(nbaPlayer));
        }
      }
      console.log(splayers);
    }
    res.json('success');
  } catch (error) {
    console.log(error);
    res.status(500).send('Server error');
  }
}

const updateFBSPlayerFromGoal = async (req, res) => {
  try {
    const teams = await Team.find({ sportId: new ObjectId('652f31fdfb0c776ae3db47e1') });
    for (let team of teams) {
      const positions = await fetchNFLPlayersFromGoal(team.gId);
      let gplayers = [];
      for (let position of positions) {
        gplayers.push(...position.player);
      }
      const splayers = await Player.find({ sportId: new ObjectId('652f31fdfb0c776ae3db47e1'), teamId: team._id });
      console.log(team.name + ": " + splayers.length);
      for (let gplayer of gplayers) {
        let splayer = splayers.find((p) => p.name.includes(gplayer.name) || gplayer.name.includes(p.name));
        if (splayer) {
          splayer.gId = gplayer.id;
          splayer.position = gplayer.position;
          splayer.name = gplayer.name;
          await splayer.save();
        } else {
          if (gplayer.number == "" || gplayer.age == "" || isNaN(gplayer.age) || isNaN(gplayer.number) || parseInt(gplayer.age) == "NaN" || parseInt(gplayer.number) == "NaN")
            continue;
          console.log(gplayer.name);
          const nbaPlayer = new Player({
            name: gplayer.name,
            sportId: new ObjectId('652f31fdfb0c776ae3db47e1'),
            teamId: team._id,
            position: gplayer.position,
            age: parseInt(gplayer.age),
            jerseyNumber: parseInt(gplayer.number),
            gId: gplayer.id
          });
          await nbaPlayer.save();
          console.log(JSON.stringify(nbaPlayer));
        }
      }
      console.log(splayers);
    }
    res.json('success');
  } catch (error) {
    console.log(error);
    res.status(500).send('Server error');
  }
}

const updateNHLPlayerFromGoal = async (req, res) => {
  try {
    const teams = await Team.find({ sportId: new ObjectId('65108faf4fa2698548371fbd') });
    for (let team of teams) {
      const positions = await fetchNHLPlayersFromGoal(team.gId);
      let gplayers = [];
      for (let position of positions) {
        let players = confirmArray(position.player);
        gplayers.push(...players);
      }
      const splayers = await Player.find({ sportId: new ObjectId('65108faf4fa2698548371fbd'), teamId: team._id });
      console.log(team.name + ": " + splayers.length);
      for (let gplayer of gplayers) {
        let splayer = splayers.find((p) => p.name.includes(gplayer.name) || gplayer.name.includes(p.name));
        if (splayer) {
          splayer.gId = gplayer.id;
          splayer.position = gplayer.position;
          splayer.name = gplayer.name;
          await splayer.save();
        } else {
          if (gplayer.number == "" || gplayer.age == "" || parseInt(gplayer.age) == "NaN" || parseInt(gplayer.number) == "NaN")
            continue;
          console.log(gplayer.name);
          const nhlPlayer = new Player({
            name: gplayer.name,
            sportId: new ObjectId('65108faf4fa2698548371fbd'),
            teamId: team._id,
            position: gplayer.position,
            age: !isNaN(gplayer.age) ? parseInt(gplayer.age) : 0,
            jerseyNumber: !isNaN(gplayer.number) ? parseInt(gplayer.number) : 0,
            gId: gplayer.id
          });
          await nhlPlayer.save();
          console.log(JSON.stringify(nhlPlayer));
        }
      }
      console.log(splayers);
    }
    res.json('success');
  } catch (error) {
    console.log(error);
    res.status(500).send('Server error');
  }
}

const updateIndividualPlayer = async (req, res) => {
  try {
    const { sportId, sportType } = req.body;
    await Player.updateMany({ sportId: new ObjectId(sportId) }, { $set: { sportType: sportType } });
    res.json("Update Success");
  } catch (error) {
    console.log(error);
  }
}


module.exports = {
  getPlayersByProps,
  addNBAPlayersToDatabase,
  updateNBAPlayers,
  getPlayerProp,
  getTopPlayerBySport,
  addNFLPlayersToDatabase,
  getTopPlayerBy,
  getPlayerManifest,
  addNHLPlayersToDatabase,
  addMLBPlayersToDatabase,
  remove,
  resetOdds,
  updateMLBPlayers,
  addCFBPlayersToDatabase,
  addSoccerPlayer,
  updateSoccerPlayers,
  getImage,
  setNBAImage,
  updateNFLPlayers,
  setNHLImage,
  updatePlayerFromGoal,
  updateNFLPlayerFromGoal,
  updateNHLPlayerFromGoal,
  updateFBSPlayerFromGoal,
  updateIndividualPlayer
};