const Event = require('../models/Event');
const Player = require('../models/Player');
const SPlayer = require('../models/SPlayer');
const PoolBet = require('../models/Poolbets.js');
const Prop = require('../models/Prop');
const User = require('../models/User');
const Team = require('../models/Team');
const Bet = require('../models/Bet');
const { confirmArray } = require('../utils/util')
const { ObjectId } = require('mongodb');
const moment = require('moment');
const { updateCapital } = require('./capitalController');
const { updateBetResult, updateTotalBalanceAndCredits } = require('./statisticsController');
const axios = require('axios');
const {
    fetchNBAMatchData,
    fetchNFLMatchData,
    fetchNHLMatchData,
    fetchCFBMatchData,
    fetchMMAMatchData,
    fetchNBAEventsFromGoal,
    fetchNFLEventsFromGoal,
    fetchNHLEventsFromGoal,
    fetchFBSEventsFromGoal,
    fetchMMAEventsFromGoal
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
        gId: player.id,
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
        let matchList = await fetchNBAMatchData();
        if (matchList == null)
            return;
        for (const match of matchList) {
            if (match.status != 'Not Started' && match.status != 'Final' && match.status != 'After Over Time' || match.status == "Final/OT") {
                if (match.player_stats) {
                    console.log(match.id);
                    let event = await Event.findOne({ gId: match.id })
                    if (!event)
                        continue;
                    let bets = await Bet.find({ 'picks.contestId': new ObjectId(event._id) })
                    if (bets.length == 0)
                        continue;
                    let broadcastingData = {
                        contestId: event._id
                    }
                    console.log(event._id);
                    let players = [];
                    players.push(...match.player_stats.hometeam.starters.player);
                    // players.push(...match.player_stats.hometeam.bench.player);
                    players.push(...match.player_stats.awayteam.starters.player);
                    // players.push(...match.player_stats.awayteam.bench.player);

                    for (const player of players) {
                        broadcastingData.player = getNBAPlayerStats(player);
                        global.io.sockets.emit('broadcast', { broadcastingData });
                        for (let i = 0; i < bets.length; i++) {
                            for (let j = 0; j < bets[i].picks.length; j++) {
                                if (bets[i].picks[j].gId == player.id) {
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
            if (match.status == 'Final' || match.status == "Final/OT" || match.status == 'After Over Time') {
                updateNBABet(match)
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
            const index = players.findIndex(item => item.id == player.id)
            if (index >= 0) {
                players[index]['Tackles+Ast'] = parseInt(player.tackles);
            } else {
                let newPlayer = {}
                newPlayer['id'] = player.id;
                newPlayer['name'] = player.name;
                newPlayer['Tackles+Ast'] = parseInt(player.tackles);
                players.push(newPlayer)
            }
        }
    }

    tempPlayers = [];
    if (match.passing) {
        console.log("PASSING")
        if (match.passing.awayteam)
            tempPlayers.push(...confirmArray(match.passing.awayteam.player))
        if (match.passing.hometeam)
            tempPlayers.push(...confirmArray(match.passing.hometeam.player))
        for (const player of tempPlayers) {
            const parts = player.comp_att.split("/");
            const completions = parseInt(parts[0], 10);
            const attempts = parseInt(parts[1], 10);
            const index = players.findIndex(item => item.id == player.id)
            console.log(index)
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
                let newPlayer = {};
                newPlayer['id'] = player.id;
                newPlayer['name'] = player.name;
                console.log(newPlayer)
                newPlayer['Pass Yards'] = parseInt(player.yards);
                newPlayer['Pass Completions'] = completions;
                newPlayer['Pass TDs'] = parseInt(player.passing_touch_downs);
                newPlayer['Pass Attempts'] = attempts;
                newPlayer['Pass+Rush Yards'] = parseInt(player.yards);
                players.push(newPlayer)
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
            const index = players.findIndex(item => item.id == player.id)
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
                newPlayer['id'] = player.id;
                newPlayer['name'] = player.name;
                newPlayer['Rush Yards'] = parseInt(player.yards);
                newPlayer['Pass+Rush Yards'] = parseInt(player.yards);
                newPlayer['Rush+Rec Yards'] = parseInt(player.yards);
                players.push(newPlayer)
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
            const index = players.findIndex(item => item.id == player.id)
            if (index >= 0) {
                players[index]['Receiving Yards'] = parseInt(player.yards);
                players[index]['Receptions'] = parseInt(player.total_receptions);
                if (players[index]['Rushing Yards'] != undefined)
                    players[index]['Rush+Rec Yards'] = players[index]['Receiving Yards'] + players[index]['Rush Yards']
                else
                    players[index]['Rush+Rec Yards'] = players[index]['Receiving Yards']
            } else {
                let newPlayer = {}
                newPlayer['id'] = player.id;
                newPlayer['name'] = player.name;
                newPlayer['Receiving Yards'] = parseInt(player.yards);
                newPlayer['Receptions'] = parseInt(player.total_receptions);
                newPlayer['Rush+Rec Yards'] = parseInt(player.yards);
                players.push(newPlayer)
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
            const index = players.findIndex(item => item.id == player.id)
            if (index >= 0) {
                players[index]['INT'] = parseInt(player.total_interceptions);
            } else {
                let newPlayer = {}
                newPlayer['id'] = player.id;
                newPlayer['name'] = player.name;
                newPlayer['INT'] = parseInt(player.total_interceptions);
                players.push(newPlayer)
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
            const index = players.findIndex(item => item.id == player.id)
            if (index >= 0) {
                players[index]['FG Made'] = fg;
            } else {
                let newPlayer = {}
                newPlayer['id'] = player.id;
                newPlayer['name'] = player.name;
                newPlayer['FG Made'] = fg;
                players.push(newPlayer)
            }
        }
    }

    return players;
}
const updateNBABet = async (match) => {
    try {
        console.log(match);
        let event = await Event.findOne({ gId: match.id })
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
            let finished = 0, win = 0, refund = 0, lost = 0, tie = 0;
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
                        } else if (pick.result == pick.prop.odds) {
                            tie += 1;
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
                let pTotal = bet.picks.length - refund - tie;
                console.log(pTotal + " : " + refund + " : " + tie);
                console.log(win + " : " + lost);
                if (bet.betType == "high") {
                    if (lost > 0) {
                        bet.prize = 0;
                        bet.status = "lost";
                    } else {
                        if (finished == 8) {
                            if (win == 8) {
                                bet.prize = bet.entryFee * BET_8_8_HIGH;
                                bet.status = "win";
                            } else {
                                bet.status = "refund";
                            }
                        } else {
                            switch (win) {
                                case 0:
                                    bet.status = "refund";
                                    break;
                                case 1:
                                    if (tie) {
                                        bet.prize = bet.entryFee * 1.5;
                                        bet.status = "win";
                                    }
                                    if (refund) {
                                        bet.status = "refund";
                                    }
                                    break;
                                case 2:
                                    bet.prize = bet.entryFee * BET_2_2_HIGH;
                                    bet.status = "win";
                                    break;
                                case 3:
                                    bet.prize = bet.entryFee * BET_3_3_HIGH;
                                    bet.status = "win";
                                case 4:
                                    bet.prize = bet.entryFee * BET_4_4_HIGH;
                                    bet.status = "win";
                                    break;
                                case 5:
                                    bet.prize = bet.entryFee * BET_5_5_HIGH;
                                    bet.status = "win";
                                    break;
                                case 6:
                                    bet.prize = bet.entryFee * BET_6_6_HIGH;
                                    bet.status = "win";
                                    break;
                            }
                        }
                    }
                }
                else {
                    switch (pTotal) {
                        case 0:
                            bet.status = "refund";
                            break;
                        case 1:
                            switch (win) {
                                case 0:
                                    bet.prize = 0;
                                    bet.status = "lost";
                                    break;
                                case 1:
                                    if (tie) {
                                        bet.prize = bet.entryFee * 1.5;
                                        bet.status = "win";
                                    }
                                    if (refund) {
                                        bet.status = "refund";
                                    }
                                    break;
                            }
                            break;
                        case 2:
                            if (win == 2) {
                                bet.prize = bet.entryFee * BET_2_2_HIGH;
                            } else {
                                bet.prize = 0;
                                bet.status = "lost";
                            }
                            break;
                        case 3:
                            switch (win) {
                                case 3:
                                    bet.prize = bet.entryFee * BET_3_3_LOW;
                                    bet.status = "win";
                                    break;
                                case 2:
                                    bet.status = "win";
                                    bet.prize = bet.entryFee * BET_2_3_LOW;
                                    break;
                                default:
                                    bet.prize = 0;
                                    bet.status = "lost";
                            }
                            break;
                        case 4:
                            switch (win) {
                                case 4:
                                    bet.prize = bet.entryFee * BET_4_4_LOW;
                                    bet.status = "win";
                                    break;
                                case 3:
                                    bet.status = "win";
                                    bet.prize = bet.entryFee * BET_3_4_LOW;
                                    break;
                                default:
                                    bet.prize = 0;
                                    bet.status = "lost";
                            }
                            break;
                        case 5:
                            switch (win) {
                                case 5:
                                    bet.prize = bet.entryFee * BET_5_5_LOW;
                                    bet.status = "win";
                                    break;
                                case 4:
                                    bet.status = "win";
                                    bet.prize = bet.entryFee * BET_4_5_LOW;
                                    break;
                                case 3:
                                    bet.status = "win";
                                    bet.prize = bet.entryFee * BET_3_5_LOW;
                                    break;
                                default:
                                    bet.prize = 0;
                                    bet.status = "lost";
                            }
                            break;
                        case 6:
                            switch (win) {
                                case 6:
                                    bet.prize = bet.entryFee * BET_6_6_LOW;
                                    bet.status = "win";
                                    break;
                                case 5:
                                    bet.status = "win";
                                    bet.prize = bet.entryFee * BET_5_6_LOW;
                                    break;
                                case 4:
                                    bet.status = "win";
                                    bet.prize = bet.entryFee * BET_4_6_LOW;
                                    break;
                                default:
                                    bet.prize = 0;
                                    bet.status = "lost";
                            }
                            break;
                    }
                }
                console.log("status + " + bet.status);
                console.log("bet result " + bet);
                await bet.save();
                console.log("Bet udpated : " + JSON.stringify(bet));
                if (bet.status == 'win') {
                    await addPrizeTransaction(bet.userId, bet.prize, 'prize');
                    const user = await User.findById(bet.userId);
                    if (user) {
                        user.wins += 1;
                    }
                    await updateBetResult(true);
                    await updateCapital(3, await USD2Ether(bet.prize - bet.entryFee));
                    await user.save();
                } else if (bet.status == "refund") {
                    const user = await User.findById(bet.userId);
                    if (bet.credit > 0)
                        user.credits += bet.credit;
                    await addPrizeTransaction(bet.userId, bet.entryFee - bet.credit, 'refund');
                    await user.save();
                } else {
                    await updateBetResult(false);
                    await updateCapital(2, await USD2Ether(bet.entryFee - bet.credit));
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
    try {
        let matchList = await fetchNFLMatchData();
        if (matchList == null)
            return;
        for (const match of matchList) {
            console.log(match.contestID)
            console.log(match.status)
            if (match.status != 'Not Started' && match.status != 'Final' && match.status != 'After Over Time') {
                if (true) {
                    console.log(match.contestID)
                    let event = await Event.findOne({ gId: match.contestID })
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
                            for (let j = 0; j < bets[i].picks.length; j++) {
                                console.log(bets[i].picks[j].gId)
                                if (bets[i].picks[j].gId == player.id) {
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
            if (match.status === 'Final' || match.status == 'After Over Time') {
                updateNFLBet(match);
            }
        }
    } catch (err) {
        console.log(err)
    }
}

const getNHLPlayerStats = player => {
    let stats = {
        gId: player.id,
        name: player.name
    }
    stats['Total Shots'] = parseInt(player.shots_on_goal);
    stats['Total Assists'] = parseInt(player.assists);
    stats['Total Points'] = parseInt(player.goals) + parseInt(player.assists);
    stats['Total Power Play Points'] = parseInt(player.pp_goals) + parseInt(player.pp_assists);
    return stats;
}
const updateNFLBet = async (match) => {
    try {
        console.log(match.contestID);
        let event = await Event.findOne({ gId: match.contestID })
        if (!event || event.state == 3)
            return;
        console.log(JSON.stringify(event));
        let players = summarizeNFLPlayerStats(match);
        console.log("bets " + event.participants, true);
        for (const betId of event.participants) {
            let bet = await Bet.findById(betId);
            //const pick = bet.picks.find(item => item.contestId == event._id);
            if (!bet || bet.status != 'pending')
                continue;
            console.log("id" + bet._id);
            let finished = 0, win = 0, refund = 0, lost = 0, tie = 0;
            for (const pick of bet.picks) {
                if (String(pick.contestId) == String(event._id)) {
                    let result, player, play1;
                    const play = await Player.findById(pick.playerId);
                    console.log("player " + player);
                    player = players.find(item => item.id == play.gId);
                    if (player) {
                        if (player.minutes == "0")
                            result = -1;
                        else {
                            switch (pick.prop.propName) {
                                case 'Pass Yards':
                                    result = player['Pass Yards'] != undefined ? player['Pass Yards'] : 0;
                                    break;
                                case 'Pass Completions':
                                    result = player['Pass Completions'] != undefined ? player['Pass Completions'] : 0;
                                    break;
                                case 'Pass TDs':
                                    result = player['Pass TDs'] != undefined ? player['Pass TDs'] : 0;
                                    break;
                                case 'Rush Yards':
                                    result = player['Rush Yards'] != undefined ? player['Rush Yards'] : 0;
                                    break;
                                case 'Receiving Yards':
                                    result = player['Receiving Yards'] != undefined ? player['Receiving Yards'] : 0;
                                    break;
                                case 'Receptions':
                                    result = player['Receptions'] != undefined ? player['Receptions'] : 0;
                                    break;
                                case 'INT':
                                    result = player['INT'] != undefined ? player['INT'] : 0;
                                    break;
                                case 'Pass Attempts':
                                    result = player['Pass Attempts'] != undefined ? player['Pass Attempts'] : 0;
                                    break;
                                case 'FG Made':
                                    result = player['FG Made'] != undefined ? player['FG Made'] : 0;
                                    break;
                                case 'Tackles+Ast':
                                    result = player['Tackles+Ast'] != undefined ? player['Tackles+Ast'] : 0;
                                    break;
                                case 'Rush+Rec Yards':
                                    result = player['Rush+Rec Yards'] != undefined ? player['Rush+Rec Yards'] : 0;
                                    break;
                                case 'Pass+Rush Yards':
                                    result = player['Pass+Rush Yards'] != undefined ? player['Pass+Rush Yards'] : 0;
                                    break;
                            }
                        }
                    }
                    console.log("player " + player);
                    console.log("result " + result);
                    if (!player || result == undefined) {
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
                        } else if (pick.result == pick.prop.odds) {
                            tie += 1;
                        } else {
                            lost += 1;
                        }
                    }
                }
            }
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
                let pTotal = bet.picks.length - refund - tie;
                console.log(pTotal + " : " + refund + " : " + tie);
                if (bet.betType == "high") {
                    if (lost > 0) {
                        bet.prize = 0;
                        bet.status = "lost";
                    } else {
                        if (finished == 8) {
                            if (win == 8) {
                                bet.prize = bet.entryFee * BET_8_8_HIGH;
                                bet.status = "win";
                            } else {
                                bet.status = "refund";
                            }
                        } else {
                            switch (win) {
                                case 0:
                                    bet.status = "refund";
                                    break;
                                case 1:
                                    if (tie) {
                                        bet.prize = bet.entryFee * 1.5;
                                        bet.status = "win";
                                    }
                                    if (refund) {
                                        bet.status = "refund";
                                    }
                                    break;
                                case 2:
                                    bet.prize = bet.entryFee * BET_2_2_HIGH;
                                    bet.status = "win";
                                    break;
                                case 3:
                                    bet.prize = bet.entryFee * BET_3_3_HIGH;
                                    bet.status = "win";
                                case 4:
                                    bet.prize = bet.entryFee * BET_4_4_HIGH;
                                    bet.status = "win";
                                    break;
                                case 5:
                                    bet.prize = bet.entryFee * BET_5_5_HIGH;
                                    bet.status = "win";
                                    break;
                                case 6:
                                    bet.prize = bet.entryFee * BET_6_6_HIGH;
                                    bet.status = "win";
                                    break;
                            }
                        }
                    }
                }
                else {
                    switch (pTotal) {
                        case 0:
                            bet.status = "refund";
                            break;
                        case 1:
                            switch (win) {
                                case 0:
                                    bet.prize = 0;
                                    bet.status = "lost";
                                    break;
                                case 1:
                                    if (tie) {
                                        bet.prize = bet.entryFee * 1.5;
                                        bet.status = "win";
                                    }
                                    if (refund) {
                                        bet.status = "refund";
                                    }
                                    break;
                            }
                            break;
                        case 2:
                            if (win == 2) {
                                bet.prize = bet.entryFee * BET_2_2_HIGH;
                            } else {
                                bet.prize = 0;
                                bet.status = "lost";
                            }
                            break;
                        case 3:
                            switch (win) {
                                case 3:
                                    bet.prize = bet.entryFee * BET_3_3_LOW;
                                    bet.status = "win";
                                    break;
                                case 2:
                                    bet.status = "win";
                                    bet.prize = bet.entryFee * BET_2_3_LOW;
                                    break;
                                default:
                                    bet.prize = 0;
                                    bet.status = "lost";
                            }
                            break;
                        case 4:
                            switch (win) {
                                case 4:
                                    bet.prize = bet.entryFee * BET_4_4_LOW;
                                    bet.status = "win";
                                    break;
                                case 3:
                                    bet.status = "win";
                                    bet.prize = bet.entryFee * BET_3_4_LOW;
                                    break;
                                default:
                                    bet.prize = 0;
                                    bet.status = "lost";
                            }
                            break;
                        case 5:
                            switch (win) {
                                case 5:
                                    bet.prize = bet.entryFee * BET_5_5_LOW;
                                    bet.status = "win";
                                    break;
                                case 4:
                                    bet.status = "win";
                                    bet.prize = bet.entryFee * BET_4_5_LOW;
                                    break;
                                case 3:
                                    bet.status = "win";
                                    bet.prize = bet.entryFee * BET_3_5_LOW;
                                    break;
                                default:
                                    bet.prize = 0;
                                    bet.status = "lost";
                            }
                            break;
                        case 6:
                            switch (win) {
                                case 6:
                                    bet.prize = bet.entryFee * BET_6_6_LOW;
                                    bet.status = "win";
                                    break;
                                case 5:
                                    bet.status = "win";
                                    bet.prize = bet.entryFee * BET_5_6_LOW;
                                    break;
                                case 4:
                                    bet.status = "win";
                                    bet.prize = bet.entryFee * BET_4_6_LOW;
                                    break;
                                default:
                                    bet.prize = 0;
                                    bet.status = "lost";
                            }
                            break;
                    }
                }
                console.log("status + " + bet.status);
                console.log("bet result " + bet);
                await bet.save();
                console.log("Bet udpated : " + JSON.stringify(bet));
                if (bet.status == 'win') {
                    await addPrizeTransaction(bet.userId, bet.prize, 'prize');
                    const user = await User.findById(bet.userId);
                    if (user) {
                        user.wins += 1;
                    }
                    await updateBetResult(true);
                    await updateCapital(3, await USD2Ether(bet.prize - bet.entryFee));
                    await user.save();
                } else if (bet.status == "refund") {
                    const user = await User.findById(bet.userId);
                    if (bet.credit > 0)
                        user.credits += bet.credit;
                    await addPrizeTransaction(bet.userId, bet.entryFee - bet.credit, 'refund');
                    await user.save();
                } else {
                    await updateBetResult(false);
                    await updateCapital(2, await USD2Ether(bet.entryFee - bet.credit));
                }

            }
            else {
                await bet.save();
                console.log("Bet udpated : " + JSON.stringify(bet));
            }
        }
        event.state = 3;
        let betResult = -1;
        if (match.awayTeam.totalscore > match.homeTeam.totalscore)
            betResult = 1;
        else if (match.awayTeam.totalscore == match.homeTeam.totalscore)
            betResult = 0;

        console.log(betResult);
        await PoolBet.updateMany({ 'events.event': event._id }, { $set: { 'events.result': betResult } });
        await event.save();
    } catch (error) {
        console.log(error);
    }
};

const updateCFBBet = async (match) => {
    try {
        console.log(match.contestID);
        let event = await Event.findOne({ gId: match.contestID })
        if (!event || event.state == 3)
            return;
        console.log(JSON.stringify(event));
        let players = summarizeNFLPlayerStats(match);
        console.log("bets " + event.participants, true);
        for (const betId of event.participants) {
            let bet = await Bet.findById(betId);
            //const pick = bet.picks.find(item => item.contestId == event._id);
            if (!bet || bet.status != 'pending')
                continue;
            console.log("id" + bet._id);
            let finished = 0, win = 0, refund = 0, lost = 0, tie = 0;
            for (const pick of bet.picks) {
                if (String(pick.contestId) == String(event._id)) {
                    let result, player, play1;
                    const play = await Player.findById(pick.playerId);
                    console.log("player " + player);
                    player = players.find(item => item.id == play.gId);
                    if (player) {
                        if (player.minutes == "0")
                            result = -1;
                        else {
                            switch (pick.prop.propName) {
                                case 'Pass Yards':
                                    result = player['Pass Yards'] != undefined ? player['Pass Yards'] : 0;
                                    break;
                                case 'Pass Completions':
                                    result = player['Pass Completions'] != undefined ? player['Pass Completions'] : 0;
                                    break;
                                case 'Pass TDs':
                                    result = player['Pass TDs'] != undefined ? player['Pass TDs'] : 0;
                                    break;
                                case 'Rush Yards':
                                    result = player['Rush Yards'] != undefined ? player['Rush Yards'] : 0;
                                    break;
                                case 'Receiving Yards':
                                    result = player['Receiving Yards'] != undefined ? player['Receiving Yards'] : 0;
                                    break;
                                case 'Receptions':
                                    result = player['Receptions'] != undefined ? player['Receptions'] : 0;
                                    break;
                                case 'INT':
                                    result = player['INT'] != undefined ? player['INT'] : 0;
                                    break;
                                case 'Pass Attempts':
                                    result = player['Pass Attempts'] != undefined ? player['Pass Attempts'] : 0;
                                    break;
                                case 'FG Made':
                                    result = player['FG Made'] != undefined ? player['FG Made'] : 0;
                                    break;
                                case 'Tackles+Ast':
                                    result = player['Tackles+Ast'] != undefined ? player['Tackles+Ast'] : 0;
                                    break;
                                case 'Rush+Rec Yards':
                                    result = player['Rush+Rec Yards'] != undefined ? player['Rush+Rec Yards'] : 0;
                                    break;
                                case 'Pass+Rush Yards':
                                    result = player['Pass+Rush Yards'] != undefined ? player['Pass+Rush Yards'] : 0;
                                    break;
                            }
                        }
                    }
                    console.log("player " + player);
                    console.log("result " + result);
                    if (!player || result == undefined) {
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
                        } else if (pick.result == pick.prop.odds) {
                            tie += 1;
                        } else {
                            lost += 1;
                        }
                    }
                }
            }
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
                let pTotal = bet.picks.length - refund - tie;
                console.log(pTotal + " : " + refund + " : " + tie);
                if (bet.betType == "high") {
                    if (lost > 0) {
                        bet.prize = 0;
                        bet.status = "lost";
                    } else {
                        if (finished == 8) {
                            if (win == 8) {
                                bet.prize = bet.entryFee * BET_8_8_HIGH;
                                bet.status = "win";
                            } else {
                                bet.status = "refund";
                            }
                        } else {
                            switch (win) {
                                case 0:
                                    bet.status = "refund";
                                    break;
                                case 1:
                                    if (tie) {
                                        bet.prize = bet.entryFee * 1.5;
                                        bet.status = "win";
                                    }
                                    if (refund) {
                                        bet.status = "refund";
                                    }
                                    break;
                                case 2:
                                    bet.prize = bet.entryFee * BET_2_2_HIGH;
                                    bet.status = "win";
                                    break;
                                case 3:
                                    bet.prize = bet.entryFee * BET_3_3_HIGH;
                                    bet.status = "win";
                                case 4:
                                    bet.prize = bet.entryFee * BET_4_4_HIGH;
                                    bet.status = "win";
                                    break;
                                case 5:
                                    bet.prize = bet.entryFee * BET_5_5_HIGH;
                                    bet.status = "win";
                                    break;
                                case 6:
                                    bet.prize = bet.entryFee * BET_6_6_HIGH;
                                    bet.status = "win";
                                    break;
                            }
                        }
                    }
                }
                else {
                    switch (pTotal) {
                        case 0:
                            bet.status = "refund";
                            break;
                        case 1:
                            switch (win) {
                                case 0:
                                    bet.prize = 0;
                                    bet.status = "lost";
                                    break;
                                case 1:
                                    if (tie) {
                                        bet.prize = bet.entryFee * 1.5;
                                        bet.status = "win";
                                    }
                                    if (refund) {
                                        bet.status = "refund";
                                    }
                                    break;
                            }
                            break;
                        case 2:
                            if (win == 2) {
                                bet.prize = bet.entryFee * BET_2_2_HIGH;
                            } else {
                                bet.prize = 0;
                                bet.status = "lost";
                            }
                            break;
                        case 3:
                            switch (win) {
                                case 3:
                                    bet.prize = bet.entryFee * BET_3_3_LOW;
                                    bet.status = "win";
                                    break;
                                case 2:
                                    bet.status = "win";
                                    bet.prize = bet.entryFee * BET_2_3_LOW;
                                    break;
                                default:
                                    bet.prize = 0;
                                    bet.status = "lost";
                            }
                            break;
                        case 4:
                            switch (win) {
                                case 4:
                                    bet.prize = bet.entryFee * BET_4_4_LOW;
                                    bet.status = "win";
                                    break;
                                case 3:
                                    bet.status = "win";
                                    bet.prize = bet.entryFee * BET_3_4_LOW;
                                    break;
                                default:
                                    bet.prize = 0;
                                    bet.status = "lost";
                            }
                            break;
                        case 5:
                            switch (win) {
                                case 5:
                                    bet.prize = bet.entryFee * BET_5_5_LOW;
                                    bet.status = "win";
                                    break;
                                case 4:
                                    bet.status = "win";
                                    bet.prize = bet.entryFee * BET_4_5_LOW;
                                    break;
                                case 3:
                                    bet.status = "win";
                                    bet.prize = bet.entryFee * BET_3_5_LOW;
                                    break;
                                default:
                                    bet.prize = 0;
                                    bet.status = "lost";
                            }
                            break;
                        case 6:
                            switch (win) {
                                case 6:
                                    bet.prize = bet.entryFee * BET_6_6_LOW;
                                    bet.status = "win";
                                    break;
                                case 5:
                                    bet.status = "win";
                                    bet.prize = bet.entryFee * BET_5_6_LOW;
                                    break;
                                case 4:
                                    bet.status = "win";
                                    bet.prize = bet.entryFee * BET_4_6_LOW;
                                    break;
                                default:
                                    bet.prize = 0;
                                    bet.status = "lost";
                            }
                            break;
                    }
                }
                console.log("status + " + bet.status);
                console.log("bet result " + bet);
                await bet.save();
                console.log("Bet udpated : " + JSON.stringify(bet));
                if (bet.status == 'win') {
                    await addPrizeTransaction(bet.userId, bet.prize, 'prize');
                    const user = await User.findById(bet.userId);
                    if (user) {
                        user.wins += 1;
                    }
                    await updateBetResult(true);
                    await updateCapital(3, await USD2Ether(bet.prize - bet.entryFee));
                    await user.save();
                } else if (bet.status == "refund") {
                    const user = await User.findById(bet.userId);
                    if (bet.credit > 0)
                        user.credits += bet.credit;
                    await addPrizeTransaction(bet.userId, bet.entryFee - bet.credit, 'refund');
                    await user.save();
                } else {
                    await updateBetResult(false);
                    await updateCapital(2, await USD2Ether(bet.entryFee - bet.credit));
                }

            }
            else {
                await bet.save();
                console.log("Bet udpated : " + JSON.stringify(bet));
            }
        }
        event.state = 3;
        let betResult = 1;
        if (match.awayTeam.totalscore > match.homeTeam.totalscore)
            betResult = -1;
        else if (match.awayTeam.totalscore == match.homeTeam.totalscore)
            betResult = 0;

        await event.save();
    } catch (error) {
        console.log(error);
    }
};
const testPoolBets = async (req, res) => {
    const { eventId, result } = req.body;
    try {
        await PoolBet.updateMany({ 'events.event': new ObjectId(eventId) }, { $set: { "events.$[elem].betResult": result } }, { arrayFilters: [{ "elem.event": new ObjectId(eventId) }] });
        res.json("success");
    } catch (error) {
        console.log(error);
        res.status(500).send("error");
    }
}
const getNHLMatchData = async () => {
    try {
        let matchList = await fetchNHLMatchData();
        if (matchList == null)
            return;
        for (const match of matchList) {
            if (match.status != 'Not Started' && match.status != 'Final' && match.status != 'After Over Time') {
                if (match.player_stats) {
                    let event = await Event.findOne({ gId: match.id })
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
                            for (let j = 0; j < bets[i].picks.length; j++) {
                                if (bets[i].picks[j].gId == player.id) {
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
            if (match.status === 'Final' || match.status == 'After Over Time') {
                updateNHLBet(match)
            }
        }
    } catch (err) {
        console.log(err)
    }

}
const updateNHLBet = async (match) => {
    try {
        console.log(match);
        let event = await Event.findOne({ gId: match.id })
        if (!event || event.state == 3)
            return;
        console.log(JSON.stringify(event));
        let players = [];
        players.push(...match.player_stats.hometeam.player);
        players.push(...match.player_stats.awayteam.player);
        console.log("bets " + event.participants, true);
        for (const betId of event.participants) {
            let bet = await Bet.findById(betId);
            //const pick = bet.picks.find(item => item.contestId == event._id);
            if (!bet || bet.status != 'pending')
                continue;
            console.log("id" + bet._id);
            let finished = 0, win = 0, refund = 0, lost = 0, tie = 0;
            for (const pick of bet.picks) {
                if (String(pick.contestId) == String(event._id)) {
                    let result, player, play1;
                    const play = await Player.findById(pick.playerId);
                    console.log("player " + player);
                    player = players.find(item => item.id == play.gId);
                    if (player) {
                        switch (pick.prop.propName) {
                            case 'Total Shots':
                                result = parseInt(player.shots_on_goal);
                                break;
                            case 'Total Assists':
                                result = parseInt(player.assists);
                                break;
                            case 'Total Points':
                                result = parseInt(player.goals) + parseInt(player.assists);
                                break;
                            case 'Total Power Play Points':
                                result = parseInt(player.pp_goals) + parseInt(player.pp_assists);
                                break;
                        }
                    }
                    console.log("player " + player);
                    console.log("result " + result);
                    if (!player || result == undefined) {
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
                        } else if (pick.result == pick.prop.odds) {
                            tie += 1;
                        } else {
                            lost += 1;
                        }
                    }
                }
            }
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
                let pTotal = bet.picks.length - refund - tie;
                console.log(pTotal + " : " + refund + " : " + tie);
                if (bet.betType == "high") {
                    if (lost > 0) {
                        bet.prize = 0;
                        bet.status = "lost";
                    } else {
                        if (finished == 8) {
                            if (win == 8) {
                                bet.prize = bet.entryFee * BET_8_8_HIGH;
                                bet.status = "win";
                            } else {
                                bet.status = "refund";
                            }
                        } else {
                            switch (win) {
                                case 0:
                                    bet.status = "refund";
                                    break;
                                case 1:
                                    if (tie) {
                                        bet.prize = bet.entryFee * 1.5;
                                        bet.status = "win";
                                    }
                                    if (refund) {
                                        bet.status = "refund";
                                    }
                                    break;
                                case 2:
                                    bet.prize = bet.entryFee * BET_2_2_HIGH;
                                    bet.status = "win";
                                    break;
                                case 3:
                                    bet.prize = bet.entryFee * BET_3_3_HIGH;
                                    bet.status = "win";
                                case 4:
                                    bet.prize = bet.entryFee * BET_4_4_HIGH;
                                    bet.status = "win";
                                    break;
                                case 5:
                                    bet.prize = bet.entryFee * BET_5_5_HIGH;
                                    bet.status = "win";
                                    break;
                                case 6:
                                    bet.prize = bet.entryFee * BET_6_6_HIGH;
                                    bet.status = "win";
                                    break;
                            }
                        }
                    }
                }
                else {
                    switch (pTotal) {
                        case 0:
                            bet.status = "refund";
                            break;
                        case 1:
                            switch (win) {
                                case 0:
                                    bet.prize = 0;
                                    bet.status = "lost";
                                    break;
                                case 1:
                                    if (tie) {
                                        bet.prize = bet.entryFee * 1.5;
                                        bet.status = "win";
                                    }
                                    if (refund) {
                                        bet.status = "refund";
                                    }
                                    break;
                            }
                            break;
                        case 2:
                            if (win == 2) {
                                bet.prize = bet.entryFee * BET_2_2_HIGH;
                            } else {
                                bet.prize = 0;
                                bet.status = "lost";
                            }
                            break;
                        case 3:
                            switch (win) {
                                case 3:
                                    bet.prize = bet.entryFee * BET_3_3_LOW;
                                    bet.status = "win";
                                    break;
                                case 2:
                                    bet.status = "win";
                                    bet.prize = bet.entryFee * BET_2_3_LOW;
                                    break;
                                default:
                                    bet.prize = 0;
                                    bet.status = "lost";
                            }
                            break;
                        case 4:
                            switch (win) {
                                case 4:
                                    bet.prize = bet.entryFee * BET_4_4_LOW;
                                    bet.status = "win";
                                    break;
                                case 3:
                                    bet.status = "win";
                                    bet.prize = bet.entryFee * BET_3_4_LOW;
                                    break;
                                default:
                                    bet.prize = 0;
                                    bet.status = "lost";
                            }
                            break;
                        case 5:
                            switch (win) {
                                case 5:
                                    bet.prize = bet.entryFee * BET_5_5_LOW;
                                    bet.status = "win";
                                    break;
                                case 4:
                                    bet.status = "win";
                                    bet.prize = bet.entryFee * BET_4_5_LOW;
                                    break;
                                case 3:
                                    bet.status = "win";
                                    bet.prize = bet.entryFee * BET_3_5_LOW;
                                    break;
                                default:
                                    bet.prize = 0;
                                    bet.status = "lost";
                            }
                            break;
                        case 6:
                            switch (win) {
                                case 6:
                                    bet.prize = bet.entryFee * BET_6_6_LOW;
                                    bet.status = "win";
                                    break;
                                case 5:
                                    bet.status = "win";
                                    bet.prize = bet.entryFee * BET_5_6_LOW;
                                    break;
                                case 4:
                                    bet.status = "win";
                                    bet.prize = bet.entryFee * BET_4_6_LOW;
                                    break;
                                default:
                                    bet.prize = 0;
                                    bet.status = "lost";
                            }
                            break;
                    }
                }
                console.log("status + " + bet.status);
                console.log("bet result " + bet);
                await bet.save();
                console.log("Bet udpated : " + JSON.stringify(bet));
                if (bet.status == 'win') {
                    await addPrizeTransaction(bet.userId, bet.prize, 'prize');
                    const user = await User.findById(bet.userId);
                    if (user) {
                        user.wins += 1;
                    }
                    await updateBetResult(true);
                    await updateCapital(3, await USD2Ether(bet.prize - bet.entryFee));
                    await user.save();
                } else if (bet.status == "refund") {
                    const user = await User.findById(bet.userId);
                    if (bet.credit > 0)
                        user.credits += bet.credit;
                    await addPrizeTransaction(bet.userId, bet.entryFee - bet.credit, 'refund');
                    await user.save();
                } else {
                    await updateBetResult(false);
                    await updateCapital(2, await USD2Ether(bet.entryFee - bet.credit));
                }

            }
            else {
                await bet.save();
                console.log("Bet udpated : " + JSON.stringify(bet));
            }
        }
        event.state = 3;
        await event.save();
    } catch (error) {
        console.log(error);
    }
};
const getCFBMatchData = async () => {
    try {
        let matchList = await fetchCFBMatchData();
        if (matchList == null)
            return;
        for (const match of matchList) {
            if (match.status != 'Not Started' && match.status != 'Final' && match.status != 'After Over Time') {
                if (match.player_stats) {
                    let event = await Event.findOne({ gId: match.contestID })
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
                            for (let j = 0; j < bets[i].picks.length; j++) {
                                if (bets[i].picks[j].gId == player.id) {
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
            if (match.status == 'Final' || match.status == 'After Over Time') {
                updateCFBBet(match)
            }
        }
    } catch (err) {
        console.log(err)
    }
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
                console.log(incomingDate);
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
                let existingEvent = await Event.findOne({ sportId: new ObjectId('64f78bc5d0686ac7cf1a6855'), gId: game.id });
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
                            let player = await Player.findOne({ name: new RegExp(name, 'i'), sportId: new ObjectId('64f78bc5d0686ac7cf1a6855') });
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

const getMMAEventsfromGoal = async () => {
    try {
        let matches = await fetchMMAEventsFromGoal();
        if (matches.length < 1)
            return;
        for (let day of matches) {
            let match = confirmArray(day.match);
            for (let game of match) {
                console.log(game);
                if (game.odds == null || game.odds == undefined)
                    continue;
                const incomingDate = game['@date'] + ' ' + game['@time'];
                console.log(incomingDate);
                const dateMoment = moment(incomingDate, "DD.MM.YYYY HH:mm:ss");
                const dateGMT = moment.utc(dateMoment.format("YYYY-MM-DDTHH:mm:ss"));
                console.log(dateGMT);
                let myEvent = new Event({
                    gId: game['@id'],
                    startTime: dateGMT.toDate(),
                    sportId: new ObjectId('6554d8f5fe0f72406f460f6a')
                });
                let homePlayer = await Player.findOne({ sportId: new ObjectId('6554d8f5fe0f72406f460f6a'), gId: game.localteam['@id'] });
                if (!homePlayer) {
                    homePlayer = new Player({
                        sportId: new ObjectId('6554d8f5fe0f72406f460f6a'),
                        name: game.localteam['@name'],
                        gId: game.localteam['@id'],
                        position: "F"
                    });
                    await homePlayer.save();
                }
                let awayPlayer = await Player.findOne({ sportId: new ObjectId('6554d8f5fe0f72406f460f6a'), gId: game.awayteam['@id'] });
                if (!awayPlayer) {
                    awayPlayer = new Player({
                        sportId: new ObjectId('6554d8f5fe0f72406f460f6a'),
                        name: game.awayteam['@name'],
                        gId: game.awayteam['@id'],
                        position: "F"
                    });
                    await awayPlayer.save();
                }
                myEvent.name = homePlayer.name + " vs " + awayPlayer.name;
                myEvent.competitors.push(homePlayer);
                myEvent.competitors.push(awayPlayer);
                let existingEvent = await Event.findOne({ sportId: new ObjectId('6554d8f5fe0f72406f460f6a'), gId: game['@id'] });
                if (existingEvent) {
                    //myEvent = existingEvent;
                    existingEvent.startTime = myEvent.startTime;
                    await existingEvent.save();
                    myEvent = existingEvent;
                } else {
                    // Event doesn't exist, insert new event
                    await myEvent.save();
                    console.log('MMA New event inserted! _id=' + myEvent._id);
                }
                let types = game.odds.type.filter((obj) => obj.bookmaker != undefined);
                for (let type of types) {
                    console.log(JSON.stringify(type));
                    let odds = type.bookmaker.odd;
                    if (!odds)
                        continue;
                    let result = odds.map(item => {
                        let name = item['@name'].split(/ (\w+:)/)[0];
                        let condition = item['@name'].split(/ (\w+:)/)[1].replace(':', '');
                        let value = item['@name'].split(/ (\w+:)/)[2].replace(':', '');;

                        return {
                            name,
                            condition,
                            value: parseFloat(value)
                        };
                    });
                    let arr = new Array(result.length).fill(1);
                    let prop = await Prop.findOne({ srId: type['@id'], sportId: new ObjectId('6554d8f5fe0f72406f460f6a') });
                    console.log(type['@id'] + type['@value']);
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
                            let player = await Player.findOne({ name: new RegExp(name, 'i'), sportId: new ObjectId('6554d8f5fe0f72406f460f6a') });
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
    }
}

const getMatchData = async () => {
    await getNBAMatchData();
    await getNFLMatchData();
    await getNHLMatchData();
    await getCFBMatchData();
    await getMMAMatchData();
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
                console.log(dateGMT.toDate());
                console.log(JSON.stringify(game));
                let myEvent = new Event({
                    gId: game.contestID,
                    startTime: dateGMT.toDate(),
                    sportId: new ObjectId('650e0b6fb80ab879d1c142c8')
                });
                console.log(JSON.stringify(myEvent));
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
                let existingEvent = await Event.findOne({ sportId: new ObjectId('650e0b6fb80ab879d1c142c8'), gId: game.contestID });
                if (existingEvent) {
                    //myEvent = existingEvent;
                    existingEvent.startTime = myEvent.startTime;
                    await existingEvent.save();
                    myEvent = existingEvent;
                } else {
                    // Event doesn't exist, insert new event
                    await myEvent.save();
                    console.log('NFL New event inserted! _id=' + myEvent._id);
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
                            let player = await Player.findOne({ name: new RegExp(name, 'i'), sportId: new ObjectId('650e0b6fb80ab879d1c142c8') });
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
        res.json('success');
    } catch (error) {
        console.log(error);
        //res.status(500).send('Server Error');
    }
}

const getFBSEventsfromGoal = async () => {
    try {
        console.log("------");
        let matches = await fetchFBSEventsFromGoal();
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
                console.log(dateGMT.toDate());
                console.log(JSON.stringify(game));
                let myEvent = new Event({
                    gId: game.contestID,
                    startTime: dateGMT.toDate(),
                    sportId: new ObjectId('652f31fdfb0c776ae3db47e1')
                });
                console.log(JSON.stringify(myEvent));
                const homeTeam = await Team.findOne({
                    sportId: new ObjectId('652f31fdfb0c776ae3db47e1'),
                    gId: game.hometeam.id
                });
                const awayTeam = await Team.findOne({
                    sportId: new ObjectId('652f31fdfb0c776ae3db47e1'),
                    gId: game.awayteam.id
                });

                if (!homeTeam || !awayTeam)
                    continue;

                myEvent.name = homeTeam.alias + " vs " + awayTeam.alias;
                myEvent.competitors.push(homeTeam);
                myEvent.competitors.push(awayTeam);
                let existingEvent = await Event.findOne({ sportId: new ObjectId('652f31fdfb0c776ae3db47e1'), gId: game.contestID });
                if (existingEvent) {
                    //myEvent = existingEvent;
                    existingEvent.startTime = myEvent.startTime;
                    await existingEvent.save();
                    myEvent = existingEvent;
                } else {
                    // Event doesn't exist, insert new event
                    await myEvent.save();
                    console.log('FBS New event inserted! _id=' + myEvent._id);
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
                    let prop = await Prop.findOne({ srId: type.id, sportId: new ObjectId('652f31fdfb0c776ae3db47e1') });
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
                            let player = await Player.findOne({ name: new RegExp(name, 'i'), sportId: new ObjectId('652f31fdfb0c776ae3db47e1') });
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
        res.json('success');
    } catch (error) {
        console.log(error);
        //res.status(500).send('Server Error');
    }
}
const getNHLEventsfromGoal = async () => {
    try {
        console.log("------");
        let matches = await fetchNHLEventsFromGoal();
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
                console.log(dateGMT.toDate());
                console.log(JSON.stringify(game));
                let myEvent = new Event({
                    gId: game.id,
                    startTime: dateGMT.toDate(),
                    sportId: new ObjectId('65108faf4fa2698548371fbd')
                });
                console.log(JSON.stringify(myEvent));
                const homeTeam = await Team.findOne({
                    sportId: new ObjectId('65108faf4fa2698548371fbd'),
                    gId: game.hometeam.id
                });
                const awayTeam = await Team.findOne({
                    sportId: new ObjectId('65108faf4fa2698548371fbd'),
                    gId: game.awayteam.id
                });
                myEvent.name = homeTeam.alias + " vs " + awayTeam.alias;
                myEvent.competitors.push(homeTeam);
                myEvent.competitors.push(awayTeam);
                let existingEvent = await Event.findOne({ sportId: new ObjectId('65108faf4fa2698548371fbd'), gId: game.id });
                if (existingEvent) {
                    //myEvent = existingEvent;
                    existingEvent.startTime = myEvent.startTime;
                    await existingEvent.save();
                    myEvent = existingEvent;
                } else {
                    // Event doesn't exist, insert new event
                    await myEvent.save();
                    console.log('NFL New event inserted! _id=' + myEvent._id);
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
                    let prop = await Prop.findOne({ srId: type.id, sportId: new ObjectId('65108faf4fa2698548371fbd') });
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
                            let player = await Player.findOne({ name: new RegExp(name, 'i'), sportId: new ObjectId('65108faf4fa2698548371fbd') });
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
        await getNFLEventsfromGoal();
        await getNHLEventsfromGoal();
        await getFBSEventsfromGoal();
        await getMMAEventsfromGoal();
    } catch (error) {
        console.log(error);
    }
}

const summarizeMMAPlayerStats = (match) => {
    let players = [];

    let localPlayer = {}
    localPlayer['id'] = parseInt(match['localteam']['@id']);
    localPlayer['name'] = match['localteam']['@name'];
    let strikes_power = match['stats']['localteam']['strikes_power']
    localPlayer['Significant Strikes'] = parseInt(strikes_power['@head']) + parseInt(strikes_power['@body']) + parseInt(strikes_power['@legs']);
    localPlayer['Takedowns'] = parseInt(match['stats']['localteam']['takedowns']['@landed']);
    let knockdowns = parseInt(match['stats']['localteam']['knockdowns']['@total']);
    localPlayer['Fantasy Score'] = localPlayer['Significant Strikes'] * 0.6 + localPlayer['Takedowns'] * 6 + knockdowns * 12;
    players.push(localPlayer)

    let awayPlayer = {}
    awayPlayer['id'] = parseInt(match['awayteam']['@id']);
    awayPlayer['name'] = match['awayteam']['@name'];
    strikes_power = match['stats']['awayteam']['strikes_power']
    awayPlayer['Significant Strikes'] = parseInt(strikes_power['@head']) + parseInt(strikes_power['@body']) + parseInt(strikes_power['@legs']);
    awayPlayer['Takedowns'] = parseInt(match['stats']['awayteam']['takedowns']['@landed']);
    knockdowns = parseInt(match['stats']['awayteam']['knockdowns']['@total']);
    localPlayer['Fantasy Score'] = awayPlayer['Significant Strikes'] * 0.6 + awayPlayer['Takedowns'] * 6 + knockdowns * 12;
    players.push(awayPlayer)

    return players;
}


const getMMAMatchData = async () => {
    try {
        let matchList = await fetchMMAMatchData();
        if (matchList == null)
            return;
        for (const match of matchList) {
            if (match.status != 'Not Started' && match.status != 'Final' && match.status != 'After Over Time') {
                if (match.stats) {
                    let event = await Event.findOne({ gId: match['@id'] })
                    if (!event)
                        continue;
                    let bets = await Bet.find({ 'picks.contestId': new ObjectId(event._id) })
                    if (bets.length == 0)
                        continue;
                    let broadcastingData = {
                        contestId: event._id
                    }
                    let players = summarizeMMAPlayerStats(match);

                    for (const player of players) {
                        broadcastingData.player = player;
                        global.io.sockets.emit('broadcast', { broadcastingData });
                        for (let i = 0; i < bets.length; i++) {
                            for (let j = 0; j < bets[i].picks.length; j++) {
                                if (bets[i].picks[j].gId == player.id) {
                                    switch (bets[i].picks[j].prop.propName) {
                                        case 'Significant Strikes':
                                            bets[i].picks[j].liveData = player['Significant Strikes'] != undefined ? player['Significant Strikes'] : 0;
                                            break;
                                        case 'Takedowns':
                                            bets[i].picks[j].liveData = player['Takedowns'] != undefined ? player['Takedowns'] : 0;
                                            break;
                                        case 'Fantasy Score':
                                            bets[i].picks[j].liveData = player['Fantasy Score'] != undefined ? player['Fantasy Score'] : 0;
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
            if (match['@status'] == 'Final' || match['@status'] == 'After Over Time') {
                updateMMABet(match)
            }
        }
    } catch (err) {
        console.log(err)
    }
};

const updateMMABet = async (match) => {
    try {
        console.log(match);
        let event = await Event.findOne({ gId: match['@id'] })
        if (!event || event.state == 3)
            return;
        console.log(JSON.stringify(event));
        let players = summarizeMMAPlayerStats(match);
        console.log("bets " + event.participants, true);
        for (const betId of event.participants) {
            let bet = await Bet.findById(betId);
            //const pick = bet.picks.find(item => item.contestId == event._id);
            if (!bet || bet.status != 'pending')
                continue;
            console.log("id" + bet._id);
            let finished = 0, win = 0, refund = 0, lost = 0, tie = 0;
            for (const pick of bet.picks) {
                if (String(pick.contestId) == String(event._id)) {
                    let result, player, play1;
                    const play = await Player.findById(pick.playerId);
                    console.log("player " + player);
                    player = players.find(item => item.id == play.gId);
                    if (player) {
                        switch (pick.prop.propName) {
                            case 'Significant Strikes':
                                result = player['Significant Strikes'] != undefined ? player['Significant Strikes'] : 0;
                                break;
                            case 'Takedowns':
                                result = player['Takedowns'] != undefined ? player['Takedowns'] : 0;
                                break;
                            case 'Fantasy Score':
                                result = player['Fantasy Score'] != undefined ? player['Fantasy Score'] : 0;
                                break;
                        }
                    }
                    console.log("player " + player);
                    console.log("result " + result);
                    if (!player || result == undefined) {
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
                        } else if (pick.result == pick.prop.odds) {
                            tie += 1;
                        } else {
                            lost += 1;
                        }
                    }
                }
            }
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
                let pTotal = bet.picks.length - refund - tie;
                console.log(pTotal + " : " + refund + " : " + tie);
                if (bet.betType == "high") {
                    if (lost > 0) {
                        bet.prize = 0;
                        bet.status = "lost";
                    } else {
                        if (finished == 8) {
                            if (win == 8) {
                                bet.prize = bet.entryFee * BET_8_8_HIGH;
                                bet.status = "win";
                            } else {
                                bet.status = "refund";
                            }
                        } else {
                            switch (win) {
                                case 0:
                                    bet.status = "refund";
                                    break;
                                case 1:
                                    if (tie) {
                                        bet.prize = bet.entryFee * 1.5;
                                        bet.status = "win";
                                    }
                                    if (refund) {
                                        bet.status = "refund";
                                    }
                                    break;
                                case 2:
                                    bet.prize = bet.entryFee * BET_2_2_HIGH;
                                    bet.status = "win";
                                    break;
                                case 3:
                                    bet.prize = bet.entryFee * BET_3_3_HIGH;
                                    bet.status = "win";
                                case 4:
                                    bet.prize = bet.entryFee * BET_4_4_HIGH;
                                    bet.status = "win";
                                    break;
                                case 5:
                                    bet.prize = bet.entryFee * BET_5_5_HIGH;
                                    bet.status = "win";
                                    break;
                                case 6:
                                    bet.prize = bet.entryFee * BET_6_6_HIGH;
                                    bet.status = "win";
                                    break;
                            }
                        }
                    }
                }
                else {
                    switch (pTotal) {
                        case 0:
                            bet.status = "refund";
                            break;
                        case 1:
                            switch (win) {
                                case 0:
                                    bet.prize = 0;
                                    bet.status = "lost";
                                    break;
                                case 1:
                                    if (tie) {
                                        bet.prize = bet.entryFee * 1.5;
                                        bet.status = "win";
                                    }
                                    if (refund) {
                                        bet.status = "refund";
                                    }
                                    break;
                            }
                            break;
                        case 2:
                            if (win == 2) {
                                bet.prize = bet.entryFee * BET_2_2_HIGH;
                            } else {
                                bet.prize = 0;
                                bet.status = "lost";
                            }
                            break;
                        case 3:
                            switch (win) {
                                case 3:
                                    bet.prize = bet.entryFee * BET_3_3_LOW;
                                    bet.status = "win";
                                    break;
                                case 2:
                                    bet.status = "win";
                                    bet.prize = bet.entryFee * BET_2_3_LOW;
                                    break;
                                default:
                                    bet.prize = 0;
                                    bet.status = "lost";
                            }
                            break;
                        case 4:
                            switch (win) {
                                case 4:
                                    bet.prize = bet.entryFee * BET_4_4_LOW;
                                    bet.status = "win";
                                    break;
                                case 3:
                                    bet.status = "win";
                                    bet.prize = bet.entryFee * BET_3_4_LOW;
                                    break;
                                default:
                                    bet.prize = 0;
                                    bet.status = "lost";
                            }
                            break;
                        case 5:
                            switch (win) {
                                case 5:
                                    bet.prize = bet.entryFee * BET_5_5_LOW;
                                    bet.status = "win";
                                    break;
                                case 4:
                                    bet.status = "win";
                                    bet.prize = bet.entryFee * BET_4_5_LOW;
                                    break;
                                case 3:
                                    bet.status = "win";
                                    bet.prize = bet.entryFee * BET_3_5_LOW;
                                    break;
                                default:
                                    bet.prize = 0;
                                    bet.status = "lost";
                            }
                            break;
                        case 6:
                            switch (win) {
                                case 6:
                                    bet.prize = bet.entryFee * BET_6_6_LOW;
                                    bet.status = "win";
                                    break;
                                case 5:
                                    bet.status = "win";
                                    bet.prize = bet.entryFee * BET_5_6_LOW;
                                    break;
                                case 4:
                                    bet.status = "win";
                                    bet.prize = bet.entryFee * BET_4_6_LOW;
                                    break;
                                default:
                                    bet.prize = 0;
                                    bet.status = "lost";
                            }
                            break;
                    }
                }
                console.log("status + " + bet.status);
                console.log("bet result " + bet);
                await bet.save();
                console.log("Bet udpated : " + JSON.stringify(bet));
                if (bet.status == 'win') {
                    await addPrizeTransaction(bet.userId, bet.prize, 'prize');
                    const user = await User.findById(bet.userId);
                    if (user) {
                        user.wins += 1;
                    }
                    await updateBetResult(true);
                    await updateCapital(3, await USD2Ether(bet.prize - bet.entryFee));
                    await user.save();
                } else if (bet.status == "refund") {
                    const user = await User.findById(bet.userId);
                    if (bet.credit > 0)
                        user.credits += bet.credit;
                    await addPrizeTransaction(bet.userId, bet.entryFee - bet.credit, 'refund');
                    await user.save();
                } else {
                    await updateBetResult(false);
                    await updateCapital(2, await USD2Ether(bet.entryFee - bet.credit));
                }

            }
            else {
                await bet.save();
                console.log("Bet udpated : " + JSON.stringify(bet));
            }
        }
        event.state = 3;
        await event.save();
    } catch (error) {
        console.log(error);
    }
};

const updateNFLTeams = async (req, res) => {
    try {
        let events = await Event.find({ sportId: new ObjectId('650e0b6fb80ab879d1c142c8'), state: 0 });
        for (let event of events) {
            for (let competitor of event.competitors) {
                console.log(competitor.name);
                let team1 = await Team.findOne({ sportId: new ObjectId('650e0b6fb80ab879d1c142c8'), name: competitor.name });
                console.log(JSON.stringify(team1));
                console.log(team1.logo);
                competitor.logo = team1.logo;
            }
            await event.save();
        }
        console.log('success');
        res.json("success")
    } catch (error) {
        console.log(error);
    }
}

module.exports = {
    getNBAMatchData,
    getNFLMatchData,
    getNHLMatchData,
    getCFBMatchData,
    getNBAEventsfromGoal,
    getNFLEventsfromGoal,
    getNHLEventsfromGoal,
    getFBSEventsfromGoal,
    getMMAEventsfromGoal,
    getMatchData,
    getSportEventAll,
    testPoolBets,
    updateNFLTeams
}