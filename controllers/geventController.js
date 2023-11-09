const Event = require('../models/Event');
const Player = require('../models/Player');
const CFPlayer = require('../models/CFPlayer');
const Prop = require('../models/Prop');
const User = require('../models/User');
const Team = require('../models/Team');
const Bet = require('../models/Bet');
const { confirmArray } = require('../utils/util')
const { ObjectId } = require('mongodb');
const moment = require('moment');
const axios = require('axios');
const {
    fetchNBAMatchData,
    fetchNFLMatchData,
    fetchNBAEventsFromGoal
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


const getNBAEventsfromGoal = async () => {
    try {
        console.log("------");
        let matches = await fetchNBAEventsFromGoal();
        for (let day of matches) {
            let match = confirmArray(day.match);
            if (match.length == 0)
                continue;
            for (let game of match) {
                console.log(game);
                if (game.odds == null || game.odds == undefined)
                    continue;
                const incomingDate = game.datetime_utc;
                const dateMoment = moment(incomingDate, "DD.MM.YYYY HH:mm:ss");
                const dateGMT = moment.utc(dateMoment.format("YYYY-MM-DDTHH:mm:ss"));
                console.log(dateGMT);
                let myEvent = new Event({
                    id: game.id,
                    startTime: dateGMT.toDate(),
                    sportId: new ObjectId('64f78bc5d0686ac7cf1a6855')
                });
                const homeTeam = await Team.findOne({
                    sportId: new ObjectId('64f78bc5d0686ac7cf1a6855'),
                    gId: game.hometeam.id
                });
                const awayTeam = await Team.findOne({
                    sportId: new ObjectId('64f78bc5d0686ac7cf1a6855'),
                    gId: game.awayteam.id
                });
                myEvent.name = homeTeam.alias + " vs " + awayTeam.alias;
                myEvent.competitors.push(homeTeam);
                myEvent.competitors.push(awayTeam);
                let existingEvent = await Event.findOne({ sportId: new ObjectId('64f78bc5d0686ac7cf1a6855'), id: game.id });
                if (existingEvent) {
                    //myEvent = existingEvent;
                    existingEvent.startTime = myEvent.startTime;
                    await existingEvent.save();
                    myEvent = existingEvent;
                } else {
                    // Event doesn't exist, insert new event
                    await myEvent.save();
                    console.log('NBA New event inserted! _id=' + myEvent._id);
                }

                let types = game.odds.type.filter((obj) => obj.bookmaker != undefined);
                for (let type of types) {
                    let odds = type.bookmaker.odd;
                    let result = odds.map(item => {
                        let name = item.name.split(/ (\w+:)/)[0];
                        let condition = item.name.split(/ (\w+:)/)[1].replace(':', '');
                        let value = item.name.split(/ (\w+:)/)[2].replace(':', '');;

                        return {
                            name,
                            condition,
                            value: parseFloat(value),
                            us: item.us
                        };
                    });
                    let arr = new Array(result.length).fill(1);
                    let prop = await Prop.findOne({ srId: type.id, sportId: new ObjectId('64f78bc5d0686ac7cf1a6855') });
                    console.log(type.id + type.value);
                    if (!prop)
                        continue;
                    console.log(prop.name);
                    for (let i = 0; i < result.length; i++) {
                        if (arr[i] == 1) {
                            arr[i] = 0;
                            let name = result[i].name;
                            let nextIndex = result.findIndex(odd => odd.name == name && odd.condition != result[i].condition);
                            console.log(nextIndex);
                            arr[nextIndex] = 0;
                            console.log(name + ": " + result[i].value);
                            let diff = Math.abs(Math.abs(result[i].us) - Math.abs(result[nextIndex].us));
                            if (diff > 30)
                                continue;
                            let player = await Player.findOne({ name: name });
                            if (!player)
                                continue;
                            const index = player.odds.findIndex((odd) => String(odd.id) == String(prop._id));
                            if (index !== -1) {
                                player.odds[index].value = result[i].value;
                                player.odds[index].event = myEvent._id;
                            } else {
                                player.odds.push({
                                    id: prop._id,
                                    value: result[i].value,
                                    event: myEvent._id
                                });
                            }
                            await player.save();
                        }
                    }
                }
            }
        }
        console.log('success');
    } catch (error) {
        console.log(error);
        //res.status(500).send('Server Error');
    }
}

const getSportEventAll = async () => {
    try {
        await getNBAEventsfromGoal();
    } catch (error) {
        console.log(error);
    }
}
module.exports = {
    getNBAMatchData,
    getNFLMatchData,
    getNBAEventsfromGoal,
    getSportEventAll
}