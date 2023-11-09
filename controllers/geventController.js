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
    fetchNBAEventsFromGoal,
    fetchNFLEventsFromGoal
} = require('../services/eventService');
const { USD2Ether, Ether2USD } = require('../utils/util');
const {
    BET_2_2_HIGH,
    BET_3_3_HIGH,
    BET_2_3_LOW,
    BET_3_3_LOW,
    BET_3_4_LOW,
    BET_4_4_LOW,
    BET_4_4_HIGH,
    BET_3_5_LOW,
    BET_4_5_LOW,
    BET_5_5_LOW,
    BET_4_6_LOW,
    BET_5_6_LOW,
    BET_6_6_LOW,
    BET_8_8_HIGH
} = require('../config/constant');

const { addPrizeTransaction } = require('./transactionController.js');

const mutex = require('async-mutex')
const lock = new mutex.Mutex();
const redis = require('redis');
const client = redis.createClient();


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
                let event = await Event.findOne({ gId: match.id })
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
        if (match.status == 'Final' || match.status == "Final/OT") {
            updateNBABet(match)            
        }
    }
}

const updateNBABet = async (match) => {
    try {
        console.log(match);
        let event = await Event.findOne({gId: match.id})
        if (!event || event.status == 3)
            return;          
        let players = [];
        players.push(...match.player_stats.hometeam.starters.player);
        players.push(...match.player_stats.hometeam.bench.player);
        players.push(...match.player_stats.awayteam.starters.player);
        players.push(...match.player_stats.awayteam.bench.player);
        console.log(players);
        for (const betId of event.participants) {
            //const pick = bet.picks.find(item => item.contestId == event._id);
            let bet = await Bet.findById(betId);
            if (!bet || bet.status != 'pending')//
                continue;
            console.log(betId);
            let finished = 0, win = 0, refund = 0, lost = 0;
            for (const pick of bet.picks) {
                if (String(pick.contestId) == String(event._id)) {
                    let result = -1, play;
                    const player = await Player.findById(pick.playerId);
                    play = players.find(item => item.id == player.gId);
                    if (play) {
                        if (play.minutes == "0")
                            result = -1;
                        else {
                            switch (pick.prop.propName) {
                                case 'Points':
                                    result = play.points != undefined ? parseInt(play.points) : -1;
                                    break;
                                case 'Assists':
                                    result = play.assists != undefined ? parseInt(play.assists) : -1;
                                    break;
                                case 'Rebounds':
                                    result = play.total_rebounds != undefined ? parseInt(play.total_rebounds) : -1;
                                    break;
                                case '3-PT Made':
                                    result = play.threepoint_goals_made != undefined ? parseInt(play.threepoint_goals_made) : -1;
                                    break;
                                case 'Steals':
                                    result = play.steals != undefined ? parseInt(play.steals) : -1;
                                    break;
                                case 'Blocks':
                                    result = play.blocks != undefined ? parseInt(play.blocks) : -1;
                                    break;
                                case 'Turnovers':
                                    result = play.turnovers != undefined ? parseInt(play.turnovers) : -1;
                                    break;
                                case 'Points+Rebounds':
                                    result = parseInt(play.points) + parseInt(play.total_rebounds);
                                    break;
                                case 'Points+Assists':
                                    result = parseInt(play.points) + parseInt(play.assists);
                                    break;
                                case 'Rebounds+Assists':
                                    result = parseInt(play.total_rebounds) + parseInt(play.assists);
                                    break;
                                case 'Pts+Rebs+Asts':
                                    result = parseInt(play.points) + parseInt(play.total_rebounds) + parseInt(play.assists);
                                    break;
                                case 'Blocks+Steals':
                                    result = parseInt(play.blocks) + parseInt(play.steals);
                                    break;
                            }
                        }
                    }
                    console.log(result);
                    if (!play || result == -1) {
                        pick.result = -1;
                    } else {
                        pick.result = result;
                    }
                    bet.picks[bet.picks.indexOf(pick)] = pick;
                }
                if (pick.result != undefined) {
                    finished += 1;
                    if (pick.result == -1) {
                        refund += 1;
                    } else {
                        if (pick.overUnder == "over" && pick.result > pick.prop.odds ||
                            pick.overUnder == "under" && pick.result < pick.prop.odds) {
                            win += 1;
                        } else {
                            lost += 1;
                        }
                    }
                }
            }
            console.log("1840:  " + finished);
            if (bet.betType == "high" && lost > 0) {
                console.log("lost");
                bet.prize = 0;
                bet.status = "lost";
                bet.willFinishAt = new Date();
                await bet.save();
                await updateBetResult(false);
                await updateCapital(2, await USD2Ether(bet.entryFee - bet.credit));
                continue;
            }
            if (finished == bet.picks.length) {
                if (refund) {
                    if (bet.betType == "high" && lost > 0) {
                        console.log("lost");
                        bet.prize = 0;
                        bet.status = "lost";

                    } else {
                        if (bet.betType == "low") {
                            switch (bet.picks.length) {
                                case 3:
                                case 4:
                                    if (lost > 0) {
                                        console.log("lost");
                                        bet.prize = 0;
                                        bet.status = "lost";
                                    } else {
                                        console.log("refund");
                                        bet.status = "refund";
                                    }
                                    break;
                                case 5:
                                case 6:
                                    if (lost > 1) {
                                        console.log("lost");
                                        bet.prize = 0;
                                        bet.status = "lost";
                                    }
                                    else {
                                        console.log("refund");
                                        bet.status = "refund";
                                    }
                                    break;
                                default:
                                    bet.prize = 0;
                                    bet.status = "lost";
                                    break;

                            }
                        } else {
                            console.log('refund');
                            bet.status = "refund";
                        }
                    }
                    console.log("bet result ", bet);
                    await bet.save();
                    if (bet.status == "refund") {
                        const user = await User.findById(bet.userId);
                        if (bet.credit > 0)
                            user.credits += bet.credit;
                        await addPrizeTransaction(bet.userId, bet.entryFee - bet.credit, 'refund');
                        await user.save();
                    } else {
                        await updateBetResult(false);
                        await updateCapital(2, await USD2Ether(bet.entryFee - bet.credit));
                    }
                } else {
                    switch (finished) {
                        case 2:
                            if (win == 2) {
                                bet.prize = bet.entryFee * BET_2_2_HIGH;
                                bet.status = "win"
                            } else {
                                bet.prize = 0;
                                bet.status = "lost"
                            }
                            break;
                        case 3:
                            switch (win) {
                                case 2:
                                    if (bet.betType == "high") {
                                        bet.prize = 0;
                                        bet.status = "lost"
                                    } else {
                                        bet.prize = bet.entryFee * BET_2_3_LOW;
                                        bet.status = "win"
                                    }
                                    break;
                                case 3:
                                    if (bet.betType == "high")
                                        bet.prize = bet.entryFee * BET_3_3_HIGH;
                                    else
                                        bet.prize = bet.entryFee * BET_3_3_LOW;
                                    bet.status = "win"
                                    break;
                                default:
                                    bet.prize = 0;
                                    bet.status = "lost"
                                    break;
                            }
                            break;
                        case 4:
                            switch (win) {
                                case 3:
                                    if (bet.betType == "high") {
                                        bet.prize = 0;
                                        bet.status = "lost"
                                    } else {
                                        bet.prize = bet.entryFee * BET_3_4_LOW;
                                        bet.status = "win"
                                    }
                                    break;
                                case 4:
                                    if (bet.betType == "high")
                                        bet.prize = bet.entryFee * BET_4_4_HIGH;
                                    else
                                        bet.prize = bet.entryFee * BET_4_4_LOW;
                                    bet.status = "win"
                                    break;
                                default:
                                    bet.prize = 0;
                                    bet.status = "lost"
                                    break;
                            };
                            break;
                        case 5:
                            switch (win) {
                                case 3:
                                    if (bet.betType == "high") {
                                        bet.prize = 0;
                                        bet.status = "lost"
                                    } else {
                                        bet.prize = bet.entryFee * BET_3_5_LOW;
                                        bet.status = "win"
                                    }
                                    break;
                                case 4:
                                    if (bet.betType == "high") {
                                        bet.prize = 0;
                                        bet.status = "lost"
                                    } else {
                                        bet.prize = bet.entryFee * BET_4_5_LOW;
                                        bet.status = "win"
                                    }
                                    break;
                                case 5:
                                    if (bet.betType == "high") {
                                        bet.prize = 0;
                                        bet.status = "lost"
                                    } else {
                                        bet.prize = bet.entryFee * BET_5_5_LOW;
                                        bet.status = "win"
                                    }
                                    break;
                                default:
                                    bet.prize = 0;
                                    bet.status = "lost";
                                    break;
                            }
                            break;
                        case 6:
                            switch (win) {
                                case 4:
                                    if (bet.betType == "high") {
                                        bet.prize = 0;
                                        bet.status = "lost"
                                    } else {
                                        bet.prize = bet.entryFee * BET_4_6_LOW;
                                        bet.status = "win"
                                    }
                                    break;
                                case 5:
                                    if (bet.betType == "high") {
                                        bet.prize = 0;
                                        bet.status = "lost"
                                    } else {
                                        bet.prize = bet.entryFee * BET_5_6_LOW;
                                        bet.status = "win"
                                    }
                                    break;
                                case 6:
                                    bet.prize = bet.entryFee * BET_6_6_LOW;
                                    bet.status = "win"
                                    break;
                                default:
                                    bet.prize = 0;
                                    bet.status = "lost"
                                    break;
                            }
                            break;
                        case 8:
                            switch (win) {
                                case 8:
                                    bet.prize = bet.entryFee * BET_8_8_HIGH;
                                    bet.status = "win"
                                    break;
                                default:
                                    bet.prize = 0;
                                    bet.status = "lost";
                                    break;
                            }
                            break;
                        default:
                            break;
                    }
                    console.log("status + " + bet.status);
                    console.log("bet result " + bet);
                    await bet.save();

                    if (bet.status == 'win') {
                        await addPrizeTransaction(bet.userId, bet.prize, 'prize');
                        const user = await User.findById(bet.userId);
                        if (user) {
                            user.wins += 1;
                        }
                        await updateBetResult(true);
                        await updateCapital(3, await USD2Ether(bet.prize - bet.entryFee));
                        await user.save();
                    } else {
                        await updateBetResult(false);
                        await updateCapital(2, await USD2Ether(bet.entryFee - bet.credit));
                    }
                }
            }
            else {
                await bet.save();

                console.log("Bet udpated : " + JSON.stringify(bet));
            }
        }
        event.state = 3;
        await event.save();
        console.log("Update Bets from NBA Event finished at " + new Date().toString() + " Id: " + event._id);
    } catch (error) {
        console.log(error);
    }
};

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
                    gId: game.id,
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

const getNFLEventsfromGoal = async () => {
    try {
        console.log("------");
        let matches = await fetchNFLEventsFromGoal();
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
                    gId: game.id,
                    startTime: dateGMT.toDate(),
                    sportId: new ObjectId('650e0b6fb80ab879d1c142c8')
                });
                const homeTeam = await Team.findOne({
                    sportId: new ObjectId('650e0b6fb80ab879d1c142c8'),
                    gId: game.hometeam.id
                });
                const awayTeam = await Team.findOne({
                    sportId: new ObjectId('650e0b6fb80ab879d1c142c8'),
                    gId: game.awayteam.id
                });
                myEvent.name = homeTeam.alias + " vs " + awayTeam.alias;
                myEvent.competitors.push(homeTeam);
                myEvent.competitors.push(awayTeam);
                let existingEvent = await Event.findOne({ sportId: new ObjectId('650e0b6fb80ab879d1c142c8'), id: game.id });
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
                    let prop = await Prop.findOne({ srId: type.id, sportId: new ObjectId('650e0b6fb80ab879d1c142c8') });
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
                            let player = await Player.findOne({ name: new RegExp(name, 'i') });
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