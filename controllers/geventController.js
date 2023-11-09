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
    fetchNHLMatchData,
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
    try {
        let matchList = fetchNBAMatchData();
        for (const match of matchList) {
            if (match.status != 'Not Started' && match.status != 'Final') {
                if (match.player_stats) {
                    let event = await Event.findOne({ gid: match.id })
                    if (!event)
                        continue;
                    let bets = await Bet.find({ 'picks.contestId': new ObjectId(event._id) })
                    if (bets.length == 0)
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
    } catch (err) {
        console.log(err)
    }

}

const summarizeNFLPlayerStats = match => {

    let players = [];
    let tempPlayers = [];
    if (match.defensive) {
        if (match.defensive.awayteam)
            tempPlayers.push(...confirmArray(match.defensive.awayteam.player))
        if (match.defensive.hometeam)
            tempPlayers.push(...confirmArray(match.defensive.hometeam.player))
        for (const player of tempPlayers) {
            const index = players.findIndex(item => item[id] == player.id)
            if (index >= 0) {
                players[index]['Tackles+Ast'] = parseInt(player.tackles);
            } else {
                let newPlayer = {}
                newPlayer['Tackles+Ast'] = parseInt(player.tackles);
                player.push(newPlayer)
            }
        }
    }

    tempPlayers = [];
    if (match.passing) {
        if (match.passing.awayteam)
            tempPlayers.push(...confirmArray(match.passing.awayteam.player))
        if (match.passing.hometeam)
            tempPlayers.push(...confirmArray(match.passing.hometeam.player))
        for (const player of tempPlayers) {
            const parts = player.comp_att.split("/");
            const completions = parseInt(parts[0], 10);
            const attempts = parseInt(parts[1], 10);
            const index = players.findIndex(item => item[id] == player.id)
            if (index >= 0) {
                players[index]['Pass Yards'] = parseInt(player.yards);
                players[index]['Pass Completions'] = completions;
                players[index]['Pass TDs'] = parseInt(player.passing_touch_downs);
                players[index]['Pass Attempts'] = attempts;
                if (players[index]['Rush Yards'] != undefined)
                    players[index]['Pass+Rush Yards'] = players[index]['Pass Yards'] + players[index]['Rush Yards']
                else
                    players[index]['Pass+Rush Yards'] = players[index]['Pass Yards']
            } else {
                let newPlayer = {}
                newPlayer['Pass Yards'] = parseInt(player.yards);
                newPlayer['Pass Completions'] = completions;
                newPlayer['Pass TDs'] = parseInt(player.passing_touch_downs);
                newPlayer['Pass Attempts'] = attempts;
                newPlayer['Pass+Rush Yards'] = players[index]['Pass Yards']
                player.push(newPlayer)
            }
        }
    }
    tempPlayers = [];
    if (match.rushing) {
        if (match.rushing.awayteam)
            tempPlayers.push(...confirmArray(match.rushing.awayteam.player))
        if (match.rushing.hometeam)
            tempPlayers.push(...confirmArray(match.rushing.hometeam.player))
        for (const player of tempPlayers) {
            const index = players.findIndex(item => item[id] == player.id)
            if (index >= 0) {
                players[index]['Rush Yards'] = parseInt(player.yards);
                if (players[index]['Pass Yards'] != undefined)
                    players[index]['Pass+Rush Yards'] = players[index]['Pass Yards'] + players[index]['Rush Yards']
                else
                    players[index]['Pass+Rush Yards'] = players[index]['Rush Yards']

                if (players[index]['Receiving Yards'] != undefined)
                    players[index]['Rush+Rec Yards'] = players[index]['Receiving Yards'] + players[index]['Rush Yards']
                else
                    players[index]['Rush+Rec Yards'] = players[index]['Rush Yards']
            } else {
                let newPlayer = {}
                newPlayer['Rush Yards'] = parseInt(player.yards);
                newPlayer['Pass+Rush Yards'] = players[index]['Rush Yards']
                newPlayer['Rush+Rec Yards'] = players[index]['Rush Yards']
                player.push(newPlayer)
            }
        }
    }

    tempPlayers = [];
    if (match.receiving) {
        if (match.receiving.awayteam)
            tempPlayers.push(...confirmArray(match.receiving.awayteam.player))
        if (match.receiving.hometeam)
            tempPlayers.push(...confirmArray(match.receiving.hometeam.player))
        for (const player of tempPlayers) {
            const index = players.findIndex(item => item[id] == player.id)
            if (index >= 0) {
                players[index]['Receiving Yards'] = parseInt(player.yards);
                players[index]['Receptions'] = parseInt(player.total_receptions);
                if (players[index]['Rushing Yards'] != undefined)
                    players[index]['Rush+Rec Yards'] = players[index]['Receiving Yards'] + players[index]['Rush Yards']
                else
                    players[index]['Rush+Rec Yards'] = players[index]['Receiving Yards']
            } else {
                let newPlayer = {}
                newPlayer['Receiving Yards'] = parseInt(player.yards);
                newPlayer['Receptions'] = parseInt(player.total_receptions);
                newPlayer['Rush+Rec Yards'] = players[index]['Receiving Yards']
                player.push(newPlayer)
            }
        }
    }

    tempPlayers = [];
    if (match.interceptions) {
        if (match.interceptions.awayteam)
            tempPlayers.push(...confirmArray(match.interceptions.awayteam.player))
        if (match.interceptions.hometeam)
            tempPlayers.push(...confirmArray(match.interceptions.hometeam.player))
        for (const player of tempPlayers) {
            const index = players.findIndex(item => item[id] == player.id)
            if (index >= 0) {
                players[index]['INT'] = parseInt(player.total_interceptions);
            } else {
                let newPlayer = {}
                newPlayer['INT'] = parseInt(player.total_interceptions);
                player.push(newPlayer)
            }
        }
    }

    tempPlayers = [];
    if (match.kicking) {
        if (match.kicking.awayteam)
            tempPlayers.push(...confirmArray(match.kicking.awayteam.player))
        if (match.kicking.hometeam)
            tempPlayers.push(...confirmArray(match.kicking.hometeam.player))
        for (const player of tempPlayers) {
            const parts = player.field_goals.split("/");
            const fg = parseInt(parts[0], 10);
            const index = players.findIndex(item => item[id] == player.id)
            if (index >= 0) {
                players[index]['FG Made'] = fg;
            } else {
                let newPlayer = {}
                newPlayer['FG Made'] = fg;
                player.push(newPlayer)
            }
        }
    }

    return players;
}

const getNFLMatchData = async () => {
    try {
        let matchList = fetchNFLMatchData();
        for (const match of matchList) {
            if (match.status != 'Not Started' && match.status != 'Final') {
                if (match.player_stats) {
                    let event = await Event.findOne({ gid: match.id })
                    if (!event)
                        continue;
                    let bets = await Bet.find({ 'picks.contestId': new ObjectId(event._id) })
                    if (bets.length == 0)
                        continue;
                    let broadcastingData = {
                        contestId: event._id
                    }
                    let players = summarizeNFLPlayerStats(match);

                    for (const player of players) {
                        broadcastingData.player = player;
                        global.io.sockets.emit('broadcast', { broadcastingData });
                        for (let i = 0; i < bets.length; i++) {
                            for (let j = 0; j < bets[i].picks; j++) {
                                if (bets[i].picks[j].gid == player.id) {
                                    switch (bets[i].picks[j].prop.propName) {
                                        case 'Pass Yards':
                                            bets[i].picks[j].liveData = player['Pass Yards'] != undefined ? player['Pass Yards'] : 0;
                                            break;
                                        case 'Pass Completions':
                                            bets[i].picks[j].liveData = player['Pass Completions'] != undefined ? player['Pass Completions'] : 0;
                                            break;
                                        case 'Pass TDs':
                                            bets[i].picks[j].liveData = player['Pass TDs'] != undefined ? player['Pass TDs'] : 0;
                                            break;
                                        case 'Rush Yards':
                                            bets[i].picks[j].liveData = player['Rush Yards'] != undefined ? player['Rush Yards'] : 0;
                                            break;
                                        case 'Receiving Yards':
                                            bets[i].picks[j].liveData = player['Receiving Yards'] != undefined ? player['Receiving Yards'] : 0;
                                            break;
                                        case 'Receptions':
                                            bets[i].picks[j].liveData = player['Receptions'] != undefined ? player['Receptions'] : 0;
                                            break;
                                        case 'INT':
                                            bets[i].picks[j].liveData = player['INT'] != undefined ? player['INT'] : 0;
                                            break;
                                        case 'Pass Attempts':
                                            bets[i].picks[j].liveData = player['Pass Attempts'] != undefined ? player['Pass Attempts'] : 0;
                                            break;
                                        case 'FG Made':
                                            bets[i].picks[j].liveData = player['FG Made'] != undefined ? player['FG Made'] : 0;
                                            break;
                                        case 'Tackles+Ast':
                                            bets[i].picks[j].liveData = player['Tackles+Ast'] != undefined ? player['Tackles+Ast'] : 0;
                                            break;
                                        case 'Rush+Rec Yards':
                                            bets[i].picks[j].liveData = player['Rush+Rec Yards'] != undefined ? player['Rush+Rec Yards'] : 0;
                                            break;
                                        case 'Pass+Rush Yards':
                                            bets[i].picks[j].liveData = player['Pass+Rush Yards'] != undefined ? player['Pass+Rush Yards'] : 0;
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
    } catch (err) {
        console.log(err)
    }
}

const getNHLPlayerStats = player => {
    let stats = {
        gid: player.id,
        name: player.name
    }
    stats['Total Shots'] = parseInt(player.shots_on_goal);
    stats['Total Assists'] = parseInt(player.assists);
    stats['Total Points'] = parseInt(player.goals) + parseInt(player.assists);
    stats['Total Power Play Points'] = parseInt(player.pp_goals) + parseInt(player.pp_assists);
    return stats;
}

const getNHLMatchData = async () => {
    try {
        let matchList = fetchNHLMatchData();
        for (const match of matchList) {
            if (match.status != 'Not Started' && match.status != 'Final') {
                if (match.player_stats) {
                    let event = await Event.findOne({ gid: match.id })
                    if (!event)
                        continue;
                    let bets = await Bet.find({ 'picks.contestId': new ObjectId(event._id) })
                    if (bets.length == 0)
                        continue;
                    let broadcastingData = {
                        contestId: event._id
                    }
                    let players = [];
                    players.push(...match.player_stats.hometeam.player);
                    players.push(...match.player_stats.awayteam.player);

                    for (const player of players) {
                        broadcastingData.player = getNHLPlayerStats(player);
                        global.io.sockets.emit('broadcast', { broadcastingData });
                        for (let i = 0; i < bets.length; i++) {
                            for (let j = 0; j < bets[i].picks; j++) {
                                if (bets[i].picks[j].gid == player.id) {
                                    switch (bets[i].picks[j].prop.propName) {
                                        case 'Total Shots':
                                            bets[i].picks[j].liveData = parseInt(player.shots_on_goal);
                                            break;
                                        case 'Total Assists':
                                            bets[i].picks[j].liveData = parseInt(player.assists);
                                            break;
                                        case 'Total Points':
                                            bets[i].picks[j].liveData = parseInt(player.goals) + parseInt(player.assists);
                                            break;
                                        case 'Total Power Play Points':
                                            bets[i].picks[j].liveData = parseInt(player.pp_goals) + parseInt(player.pp_assists);
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
    } catch (err) {
        console.log(err)
    }

}



const getNBAEventsfromGoal = async (req, res) => {
    try {
        console.log("asdf");
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
        res.json('success');
    } catch (error) {
        console.log(error);
        res.status(500).send('Server Error');
    }
}
module.exports = {
    getNBAMatchData,
    getNFLMatchData,
    getNHLMatchData,
    getNBAEventsfromGoal
}