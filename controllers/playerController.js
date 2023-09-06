const Contest = require("../models/Contest");
// const Sport = require("../models/Sport");


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

module.exports = { getPlayersByProps };
