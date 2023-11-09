const Event = require('../models/Event');
const Player = require('../models/Player');
const CFPlayer = require('../models/CFPlayer');
const Prop = require('../models/Prop');
const User = require('../models/User');
const Team = require('../models/Team');
const Bet = require('../models/Bet');
const { confirmArray } = require('../utils/util')
const { ObjectId } = require('mongodb');
const axios = require('axios');
const {
    fetchNBAMatchData,
    fetchNFLMatchData
} = require('../services/eventService');

const getNBAPlayerStats = player => {
    let stats = {
        gid: player.id,
        name: player.name
    }
    stats['Points'] = parseInt(player.points);
    stats['Assists'] = parseInt(player.assists);
    stats['Rebounds'] = parseInt(player.total_rebounds);
    stats['3-PT Made'] = parseInt(player.threepoint_goals_made);
    stats['Steals'] = parseInt(player.steals);
    stats['Blocks'] = parseInt(player.blocks);
    stats['Turnovers'] = parseInt(player.turnovers)
    stats['Points+Rebounds'] = parseInt(player.points) + parseInt(player.total_rebounds);
    stats['Points+Assists'] = parseInt(player.points) + parseInt(player.assists);
    stats['Rebounds+Assists'] = parseInt(player.total_rebounds) + parseInt(player.assists);
    stats['Pts+Rebs+Asts'] = parseInt(player.points) + parseInt(player.total_rebounds) + parseInt(player.assists);
    stats['Blocks+Steals'] = parseInt(player.blocks) + parseInt(player.steals);
    return stats;
}

const getNBAMatchData = async () => {
    let matchList = fetchNBAMatchData();
    for (const match of matchList) {
        if (match.status != 'Not Started' && match.status != 'Final') {
            if (match.player_stats) {
                let event = await Event.findOne({ gid: match.id })
                if (!event)
                    continue;
                let bets = await Bet.findOne({ 'picks.contestId': new ObjectId(event._id) })
                if (bets.lenght == 0)
                    continue;
                let broadcastingData = {
                    contestId: event._id
                }
                let players = [];
                players.push(...match.player_stats.hometeam.starters.player);
                players.push(...match.player_stats.hometeam.bench.player);
                players.push(...match.player_stats.awayteam.starters.player);
                players.push(...match.player_stats.awayteam.bench.player);

                for (const player of players) {
                    broadcastingData.player = getNBAPlayerStats(player);
                    global.io.sockets.emit('broadcast', { broadcastingData });
                    for (let i = 0; i < bets.length; i++) {
                        for (let j = 0; j < bets[i].picks; j++) {
                            if (bets[i].picks[j].gid == player.id) {
                                switch (bets[i].picks[j].prop.propName) {
                                    case 'Points':
                                        bets[i].picks[j].liveData = parseInt(player.points);
                                        break;
                                    case 'Assists':
                                        bets[i].picks[j].liveData = parseInt(player.assists);
                                        break;
                                    case 'Rebounds':
                                        bets[i].picks[j].liveData = parseInt(player.total_rebounds);
                                        break;
                                    case '3-PT Made':
                                        bets[i].picks[j].liveData = parseInt(player.threepoint_goals_made);
                                        break;
                                    case 'Steals':
                                        bets[i].picks[j].liveData = parseInt(player.steals);
                                        break;
                                    case 'Blocks':
                                        bets[i].picks[j].liveData = parseInt(player.blocks);
                                        break;
                                    case 'Turnovers':
                                        bets[i].picks[j].liveData = parseInt(player.turnovers);
                                        break;
                                    case 'Points+Rebounds':
                                        bets[i].picks[j].liveData = parseInt(player.points) + parseInt(player.total_rebounds);
                                        break;
                                    case 'Points+Assists':
                                        bets[i].picks[j].liveData = parseInt(player.points) + parseInt(player.assists);
                                        break;
                                    case 'Rebounds+Assists':
                                        bets[i].picks[j].liveData = parseInt(player.total_rebounds) + parseInt(player.assists);
                                        break;
                                    case 'Pts+Rebs+Asts':
                                        bets[i].picks[j].liveData = parseInt(player.points) + parseInt(player.total_rebounds) + parseInt(player.assists);
                                        break;
                                    case 'Blocks+Steals':
                                        bets[i].picks[j].liveData = parseInt(player.blocks) + parseInt(player.steals);
                                        break;
                                }
                            }
                        }
                    }
                }
                for (const bet of bets)
                    await bet.save();
            }
        }
        if (match.status === 'Final') {
            await Event.updateOne({
                gid: match.id
            }, {
                $set: {
                    state: 2
                }
            })
        }
    }

}


const getNFLMatchData = async () => {
    let matchData = fetchNFLMatchData();
}

module.exports = {
    getNBAMatchData,
    getNFLMatchData
}