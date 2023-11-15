const Event = require('../models/Event');
const Player = require('../models/Player');
const Prop = require('../models/Prop');
const {
    ObjectId
} = require("mongodb");
const {
    fetchEventPlayerProps,    
    fetchNFLGameSummary,
    fetchMLBGameSummary,
    fetchSoccerEventSummary,
    fetchNHLGameSummary,    
    fetchCFBGameSummary,    
    fetchNBAGameSummary,
    fetchYesNBAMatchData,
    fetchYesNFLMatchData
} = require('../services/eventService');
const PlayerStat = require('../models/PlayerStat');
const {confirmArray} = require('../utils/util')
const summarizeStatsByPlayer = (data, category) => {
    const homeStats = data.statistics.home[category].players.map((player) => ({
        player: player.name,
        ...player,
    }));

    const awayStats = data.statistics.away[category].players.map((player) => ({
        player: player.name,
        ...player,
    }));

    return [...homeStats, ...awayStats];
};
const recordNFLStat = async (event) => {
    try {
        console.log(event);
        const statistics = await fetchNFLGameSummary(event.matchId);
        if(!statistics)
            return;
        console.log("summaryNFL" + event._id, true);
        const props = await Prop.find({sportId: new ObjectId("650e0b6fb80ab879d1c142c8")})
        const rushingStats = summarizeStatsByPlayer(statistics, 'rushing');
        const receivingStats = summarizeStatsByPlayer(statistics, 'receiving');
        const passingStats = summarizeStatsByPlayer(statistics, 'passing');
        const fieldGoalStats = summarizeStatsByPlayer(statistics, 'field_goals');
        const defenseStats = summarizeStatsByPlayer(statistics, 'defense');
        let index = -1;
        for(let player of rushingStats) {
            let play = await Player.findOne({remoteId: player.id});
            if(!play)
                continue;
            let playerStat = await PlayerStat.findOne({playerId: new ObjectId(play._id)});
            console.log(playerStat);
            if(!playerStat) {
                playerStat = new PlayerStat({
                    playerId: new ObjectId(play._id),
                    stats:[]
                });
            }
            console.log(playerStat);            
            if(playerStat.stats.length > 4)
                continue;
            index = playerStat.stats.length;
            let result = {
                gameName: event.name,
                date: event.startTime,
                props:[]
            };
            result.props.push({
                propName: 'Rush Yard',
                value: player.yards
            });
            let play1 = receivingStats.find(item => item.id == play.remoteId);
            if(play1) {
                result.props.push({
                    propName: 'Rush+Rec Yards',
                    value: player.yards + play1.yards
                }); 
            } else {
                result.props.push({
                    propName: 'Rush+Rec Yards',
                    value: player.yards
                }); 
            }

            let play2 = passingStats.find(item => item.id == play.remoteId);
            if(play2) {
                result.props.push({
                    propName: 'Pass+Rush Yards',
                    value: player.yards + play2.yards
                }); 
            } else {
                result.props.push({
                    propName: 'Pass+Rush Yards',
                    value: player.yards
                }); 
            }
            playerStat.stats.push(result);
            await playerStat.save();
        }
        for(let player of passingStats) {
            let play = await Player.findOne({remoteId: player.id});
            if(!play)
                continue;
            let playerStat = await PlayerStat.findOne({playerId: new ObjectId(play._id)});
            console.log(playerStat);
            if(!playerStat) {
                playerStat = new PlayerStat({
                    playerId: new ObjectId(play._id),
                    stats:[]
                });
            }
            console.log(playerStat);                               
            index = playerStat.stats.length;
            let i = playerStat.stats.findIndex(item => item.gameName == event.name && item.date.valueOf() == event.startTime.valueOf())
            console.log(i);
            if(i == -1 && index >= 5)
                contitnue;
            if(i == -1) {
                let result = {
                    gameName: event.name,
                    date: event.startTime,
                    props:[]
                };
                result.props.push({
                    propName: 'Pass Yards',
                    value: player.yards
                });
                result.props.push({
                    propName: 'Pass Attempts',
                    value: player.attempts
                });
                result.props.push({
                    propName: 'Pass Completions',
                    value: player.completions
                });
                result.props.push({
                    propName: 'Pass TDs',
                    value: player.touchdowns
                });
                result.props.push({
                    propName: 'INT',
                    value: player.interceptions
                });
                playerStat.stats.push(result);
                await playerStat.save();
            } else {
                playerStat.stats[i].props.push({
                    propName: 'Pass Yard',
                    value: player.yards
                });
                playerStat.stats[i].props.push({
                    propName: 'Pass Attempts',
                    value: player.attempts
                });
                playerStat.stats[i].props.push({
                    propName: 'Pass Completions',
                    value: player.completions
                });
                playerStat.stats[i].props.push({
                    propName: 'Pass TDs',
                    value: player.touchdowns
                });
                playerStat.stats[i].props.push({
                    propName: 'INT',
                    value: player.interceptions
                });
                await playerStat.save();
            }
        }

        for(let player of receivingStats) {
            let play = await Player.findOne({remoteId: player.id});
            if(!play)
                continue;
            let playerStat = await PlayerStat.findOne({playerId: new ObjectId(play._id)});
            console.log(playerStat);
            if(!playerStat) {
                playerStat = new PlayerStat({
                    playerId: new ObjectId(play._id),
                    stats:[]
                });
            }
            console.log(playerStat);                               
            index = playerStat.stats.length;
            let i = playerStat.stats.findIndex(item => item.gameName == event.name && item.date.valueOf() == event.startTime.valueOf())
            console.log(i);
            if(i == -1 && index >= 5)
                contitnue;
            if(i == -1) {
                let result = {
                    gameName: event.name,
                    date: event.startTime,
                    props:[]
                };
                result.props.push({
                    propName: 'Receiving Yards',
                    value: player.yards
                });
                result.props.push({
                    propName: 'Receptions',
                    value: player.receptions
                });
                
                playerStat.stats.push(result);
                await playerStat.save();
            } else {
                playerStat.stats[i].props.push({
                    propName: 'Receiving Yards',
                    value: player.yards
                });
                playerStat.stats[i].props.push({
                    propName: 'Receptions',
                    value: player.receptions
                });
                await playerStat.save();
            }
        }
        for(let player of fieldGoalStats) {
            let play = await Player.findOne({remoteId: player.id});
            if(!play)
                continue;
            let playerStat = await PlayerStat.findOne({playerId: new ObjectId(play._id)});
            console.log(playerStat);
            if(!playerStat) {
                playerStat = new PlayerStat({
                    playerId: new ObjectId(play._id),
                    stats:[]
                });
            }
            console.log(playerStat);                               
            index = playerStat.stats.length;
            let i = playerStat.stats.findIndex(item => item.gameName == event.name && item.date.valueOf() == event.startTime.valueOf())
            console.log(i);
            if(i == -1 && index >= 5)
                contitnue;
            if(i == -1) {
                let result = {
                    gameName: event.name,
                    date: event.startTime,
                    props:[]
                };
                result.props.push({
                    propName: 'FG Made',
                    value: player.made
                });                
                playerStat.stats.push(result);
                await playerStat.save();
            } else {
                playerStat.stats[i].props.push({
                    propName: 'FG Made',
                    value: player.made
                });               
                await playerStat.save();
            }
        }
        for(let player of defenseStats) {
            let play = await Player.findOne({remoteId: player.id});
            if(!play)
                continue;
            let playerStat = await PlayerStat.findOne({playerId: new ObjectId(play._id)});
            console.log(playerStat);
            if(!playerStat) {
                playerStat = new PlayerStat({
                    playerId: new ObjectId(play._id),
                    stats:[]
                });
            }
            console.log(playerStat);                               
            index = playerStat.stats.length;
            let i = playerStat.stats.findIndex(item => item.gameName == event.name && item.date.valueOf() == event.startTime.valueOf())
            console.log(i);
            if(i == -1 && index >= 5)
                contitnue;
            if(i == -1) {
                let result = {
                    gameName: event.name,
                    date: event.startTime,
                    props:[]
                };
                result.props.push({
                    propName: 'Tackles+Ast',
                    value: player.tackles + player.assists
                });                
                playerStat.stats.push(result);
                await playerStat.save();
            } else {
                playerStat.stats[i].props.push({
                    propName: 'Tackles+Ast',
                    value: player.tackles + player.assists
                });               
                await playerStat.save();
            }
        }
        event.saveStats = 1;    
        await event.save();
    } catch (error) {
        console.log(error);
    }
}

const recordMLBStat = async (event) => {

}

const recordSoccerStat = async (event) => {

}

const recordNHLStat = async (event) => {

}

const recordCFBStat = async (event) => {

}

const summarizeNBAStatsByPlayer = (data) => {
    const homeStats = data.home.players;
    const awayStats = data.away.players;

    return [...homeStats, ...awayStats];

};

const recordNBAStat = async (event) => {
    try {
        console.log(event);
        const summary = await fetchNBAGameSummary(event.matchId);
        let players = summarizeNBAStatsByPlayer(summary);
        const props = await Prop.find({sportId: new ObjectId("64f78bc5d0686ac7cf1a6855")})
        players = players.filter(item => item.played);

        for(let player of players) {

            let play = await Player.findOne({remoteId: player.id});
            if(!play)
                continue;
            let playerStat = await PlayerStat.findOne({playerId: new ObjectId(play._id)});
            console.log(playerStat);
            if(!playerStat) {
                playerStat = new PlayerStat({
                    playerId: new ObjectId(play._id),
                    stats:[]
                });
            }            
            console.log(playerStat);
            if(playerStat.stats.length > 4)
                continue;
            let result = {
                gameName: event.name,
                date: event.startTime,
                props:[]
            };
            console.log(JSON.stringify(player.statistics));
            for(let prop of props) {
                console.log(prop.displayName)
                switch(prop.displayName){
                    case 'Points':
                        console.log(JSON.stringify(player.statistics.points));
                        if(player.statistics.points != undefined){
                            result.props.push({
                                propName: 'Points',
                                value: player.statistics.points
                            });                            
                            console.log("OK1");
                        }                            
                        break;
                    case 'Assists':
                        if(player.statistics.assists != undefined)                            
                            result.props.push({
                                propName: 'Assists',
                                value: player.statistics.assists
                            });                          
                        break;                        
                    case 'Rebounds':
                        if(player.statistics.rebounds != undefined)                            
                            result.props.push({
                                propName: 'Rebounds',
                                value: player.statistics.rebounds
                            });                            
                        break;                        
                    case '3-PT Made':
                        if(player.statistics.three_points_made != undefined)                            
                            result.props.push({
                                propName: '3-PT Made',
                                value: player.statistics.three_points_made
                            });                            
                        break;                                                
                    case 'Steals':
                        if(player.statistics.steals != undefined)                            
                            result.props.push({
                                propName: 'Steals',
                                value: player.statistics.steals
                            });                            
                        break;                                                
                    case 'Blocks':
                        if(player.statistics.blocks != undefined)                            
                            result.props.push({
                                propName: 'Blocks',
                                value: player.statistics.blocks
                            });                            
                        break;                                                
                    case 'Turnovers':
                        if(player.statistics.turnovers != undefined)                            
                            result.props.push({
                                propName: 'Turnovers',
                                value: player.statistics.turnovers
                            });                            
                        break;                        
                    case 'Points+Rebounds':
                        if (player.statistics.points != undefined && player.statistics.rebounds != undefined)
                            result.props.push({
                                propName: 'Points+Rebounds',
                                value: player.statistics.points + player.statistics.rebounds
                            });                            
                            console.log("OK2");                              
                        break;
                    case 'Points+Assists':
                        if (player.statistics.points != undefined && player.statistics.assists != undefined)
                            result.props.push({
                                propName: 'Points+Assists',
                                value: player.statistics.points + player.statistics.assists
                            });                            
                        break;
                    case 'Rebounds+Assists':
                        if (player.statistics.rebounds != undefined && player.statistics.assists != undefined)
                            result.props.push({
                                propName: 'Rebounds+Assists',
                                value: player.statistics.rebounds + player.statistics.assists
                            });  
                        break;
                    case 'Pts+Rebs+Asts':
                        if (player.statistics.points != undefined && player.statistics.rebounds != undefined && player.statistics.assists != undefined)
                            result.props.push({
                                propName: 'Pts+Rebs+Asts',
                                value: player.statistics.points + player.statistics.rebounds + player.statistics.assists
                            });  
                        break;
                    case 'Blocks+Steals':
                        if (player.statistics.blocks != undefined && player.statistics.steals != undefined)
                            result.props.push({
                                propName: 'Blocks+Steals',
                                value: player.statistics.blocks + player.statistics.steals
                            });                          
                        break;
                }
            }
            if(playerStat.stats.length == 5)
                playerStat.stats.splice(0);
            console.log(result);
            playerStat.stats.push(result);
            await playerStat.save();
        }
        event.saveStats = 1;    
        await event.save();

    } catch (error) {
        console.log(error);
    }
}

const NBAstats = async(req, res) => {
    const events = await Event.find({state: 3, sportId: new ObjectId("64f78bc5d0686ac7cf1a6855")}).sort({startTime: -1});
    for(const event of events){
         await   recordNBAStat(event);
    }
    console.log("NBA stats updated");
    res.json("Stats updated");
}

const NFLstats = async(req, res) => {
    const events = await Event.find({state: 3, sportId: new ObjectId("650e0b6fb80ab879d1c142c8")}).sort({startTime: -1});
    for(const event of events){
         await   recordNFLStat(event);
    }
    console.log("NFL stats updated");
    res.json("Stats updated");
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
const updateNFLPlayerStats = async () => {
    try {
        let matchList = await fetchYesNFLMatchData();
        if(matchList == null)
            return;
        const props = await Prop.find({sportId: new ObjectId("650e0b6fb80ab879d1c142c8"), available: true})
        for (const match of matchList) {
            console.log(match.contestID);
            console.log(match.status);
            if (match.status === 'Final' || match.status == 'After Over Time') {
                let event = await Event.findOne({gId:match.contestID, state: 3, saveStats: 0})
                if(!event)
                continue;
                //console.log(event);
                let players = summarizeNFLPlayerStats(match);
                
                for(let player of players) {
                    let plyr = await Player.findOne({gId: player.id});
                    if (!plyr)
                        continue;
                    let playerStat = await PlayerStat.findOne({playerId: new ObjectId(plyr._id)});
                    if (!playerStat) {
                        playerStat = new PlayerStat({
                            playerId: new ObjectId(plyr._id),
                            stats: []
                        });
                    }
                    let result = {
                        gameName: event.name,
                        date: event.startTime,
                        props: []
                    };
                    for(let prop of props) {
                        console.log(prop.displayName);
                        switch(prop.displayName) {
                            case 'Pass Yards':
                                if(player['Pass Yards'] != undefined)
                                    result.props.push({
                                        propName: 'Pass Yards',
                                        value: player['Pass Yards']
                                    });
                                break;
                            case 'Pass Completions':
                                if(player['Pass Completions'] != undefined)
                                    result.props.push({
                                        propName: 'Pass Completions',
                                        value: player['Pass Completions']
                                    });                                
                                break;
                            case 'Pass TDs':
                                if(player['Pass TDs'] != undefined)
                                    result.props.push({
                                        propName: 'Pass TDs',
                                        value: player['Pass TDs']
                                    });                                
                                break;                                
                            case 'Rush Yards':
                                if(player['Rush Yards'] != undefined)
                                    result.props.push({
                                        propName: 'Rush Yards',
                                        value: player['Rush Yards']
                                    });                                
                                break;                                
                            case 'Receiving Yards':
                                if(player['Receiving Yards'] != undefined)
                                    result.props.push({
                                        propName: 'Receiving Yards',
                                        value: player['Receiving Yards']
                                    });                                
                                break;                                
                            case 'Receptions':
                                if(player['Receptions'] != undefined)
                                    result.props.push({
                                        propName: 'Receptions',
                                        value: player['Receptions']
                                    });                                
                                break;                                
                            case 'INT':
                                if(player['INT'] != undefined)
                                    result.props.push({
                                        propName: 'INT',
                                        value: player['INT']
                                    });                                
                                break;                                
                            case 'Pass Attempts':
                                if(player['Pass Attempts'] != undefined)
                                    result.props.push({
                                        propName: 'Pass Attempts',
                                        value: player['Pass Attempts']
                                    });                                
                                break;
                            case 'FG Made':
                                if(player['FG Made'] != undefined)
                                    result.props.push({
                                        propName: 'FG Made',
                                        value: player['FG Made']
                                    });                                
                                break;
                                
                            case 'Tackles+Ast':
                                if(player['Tackles+Ast'] != undefined)
                                    result.props.push({
                                        propName: 'Tackles+Ast',
                                        value: player['Tackles+Ast']
                                    });                                
                                break;
                                
                            case 'Rush+Rec Yards':
                                if(player['Rush+Rec Yards'] != undefined)
                                    result.props.push({
                                        propName: 'Rush+Rec Yards',
                                        value: player['Rush+Rec Yards']
                                    });                                
                                break;
                                
                            case 'Pass+Rush Yards':
                                if(player['Pass+Rush Yards'] != undefined)
                                    result.props.push({
                                        propName: 'Pass+Rush Yards',
                                        value: player['Pass+Rush Yards']
                                    });                                
                                break;                                
                        }
                    }
                    if(playerStat.stats.length == 5)
                    playerStat.stats.splice(0);
                    console.log(result);
                    playerStat.stats.push(result);
                    await playerStat.save();
                }

                event.saveStats = 1;
                await event.save();
            }
        }       
    } catch (error) {
        console.log(error);
    }
}

const updateNBAPlayerStats = async () => {
    try {
        let matchList = await fetchYesNBAMatchData();
        if (matchList == null)
            return;
        const props = await Prop.find({sportId: new ObjectId("64f78bc5d0686ac7cf1a6855"), available: true})
        for (const match of matchList) {
            console.log(match.id);
            if (match.status == 'Final' || match.status == "Final/OT" || match.status == 'After Over Time') {
                let event = await Event.findOne({gId:match.id, state: 3, saveStats: 0});
                if(!event)
                    continue;
                let players = [];
                players.push(...match.player_stats.hometeam.starters.player);
                players.push(...match.player_stats.hometeam.bench.player);
                players.push(...match.player_stats.awayteam.starters.player);
                players.push(...match.player_stats.awayteam.bench.player);

                for(let player of players) {
                    let play = await Player.findOne({gId: player.id});
                    if (!play)
                        continue;
                    let playerStat = await PlayerStat.findOne({playerId: new ObjectId(play._id)});
                    if (!playerStat) {
                        playerStat = new PlayerStat({
                            playerId: new ObjectId(play._id),
                            stats: []
                        });
                    }
                    console.log(playerStat);
                    let result = {
                        gameName: event.name,
                        date: event.startTime,
                        props: []
                    };
                    for(let prop of props) {
                        console.log(prop.displayName);
                        switch(prop.displayName) {
                            case 'Points':
                                if(player.points != undefined)
                                    result.props.push({
                                        propName: 'Points',
                                        value: parseInt(player.points)
                                    });
                                break;
                            case 'Assists':
                                if(player.points != undefined)
                                    result.props.push({
                                        propName: 'Assists',
                                        value: parseInt(player.assists)
                                    });
                                break;
                            case 'Rebounds':
                                if(player.total_rebounds != undefined)
                                    result.props.push({
                                        propName: 'Rebounds',
                                        value: parseInt(player.total_rebounds)
                                    });
                                break;
                            case '3-PT Made':
                                if(player.threepoint_goals_made != undefined)
                                    result.props.push({
                                        propName: '3-PT Made',
                                        value: parseInt(player.threepoint_goals_made)
                                    });
                                break;                                
                            case 'Steals':
                                if(player.steals != undefined)
                                    result.props.push({
                                        propName: 'Steals',
                                        value: parseInt(player.steals)
                                    });
                                break;                                
                            case 'Blocks':
                                if(player.blocks != undefined)
                                    result.props.push({
                                        propName: 'Blocks',
                                        value: parseInt(player.blocks)
                                    });
                                break;                                
                            case 'Turnovers':
                                if(player.turnovers != undefined)
                                    result.props.push({
                                        propName: 'Turnovers',
                                        value: parseInt(player.turnovers)
                                    });
                                break;                                
                            case 'Points+Rebounds':
                                
                                    result.props.push({
                                        propName: 'Points+Rebounds',
                                        value: parseInt(player.points) + parseInt(player.total_rebounds)
                                    });
                                break;
                                
                            case 'Points+Assists':
                                if(player.points != undefined)
                                    result.props.push({
                                        propName: 'Points+Assists',
                                        value: parseInt(player.points) + parseInt(player.assists)
                                    });
                                break;                                
                            case 'Rebounds+Assists':
                                if(player.assists != undefined)
                                    result.props.push({
                                        propName: 'Rebounds+Assists',
                                        value: parseInt(player.total_rebounds) + parseInt(player.assists)
                                    });
                                break;                                
                            case 'Pts+Rebs+Asts':
                                if(player.points != undefined)
                                    result.props.push({
                                        propName: 'Pts+Rebs+Asts',
                                        value: parseInt(player.points) + parseInt(player.total_rebounds) + parseInt(player.assists)
                                    });
                                break;                                
                            case 'Blocks+Steals':
                                if(player.blocks != undefined)
                                    result.props.push({
                                        propName: 'Blocks+Steals',
                                        value: parseInt(player.blocks) + parseInt(player.steals)
                                    });
                                break;                                
                        }
                    }
                    if(playerStat.stats.length == 5)
                        playerStat.stats.splice(0, 1);
                    console.log(result);
                    playerStat.stats.push(result);
                    await playerStat.save();
                }
                event.saveStats = 1;
                await event.save();
            }
        }
    } catch(error) {
        console.log('Error in updating NBA Player Stats');
        console.log(error);
    }
};
  
const recordStats = async () => {

    await updateNBAPlayerStats();
    await updateNFLPlayerStats();
    // const events = await Event.find({state: 3, saveStats: 0});
    // for(const event of events){
    //     if (String(event.sportId) == '650e0b6fb80ab879d1c142c8') {
    //         console.log("NFL " + event._id);
    //         await recordNFLStat(event);
    //     }
    //     else if (String(event.sportId) == String('65108fcf4fa2698548371fc0')) {
    //         console.log("MLB " + event._id);
    //         await recordMLBStat(event);
    //     }
    //     else if (String(event.sportId) == '65131974db50d0c2c8bf7aa7') {
    //         console.log("Soccer " + event._id);
    //         await recordSoccerStat(event);
    //     }
    //     else if (String(event.sportId) == '65108faf4fa2698548371fbd') {
    //         console.log("NHL " + event._id);
    //         await recordNHLStat(event);
    //     } else if ((String(event.sportId) == '652f31fdfb0c776ae3db47e1')) {
    //         console.log("CFB " + event._id);
    //         await recordCFBStat(event);
    //     }
    //     else if ((String(event.sportId) == '64f78bc5d0686ac7cf1a6855')) {
    //         console.log("NBA " + event._id);
    //         await recordNBAStat(event);
    //     }
    // }

}

const getPlayerStats = async (req, res) => {
    try {
        let {playerId} = req.body;
        let stats = await PlayerStat.findOne({playerId: new ObjectId(playerId)});
        if(stats)
            res.json(stats);
        else
            res.status(404).send("Player not found");
    } catch (error) {
        console.log(error);
        res.status(500).send("Server Error");
    }
}
module.exports = {
    recordNFLStat,
    recordMLBStat,
    recordSoccerStat,
    recordNHLStat,
    recordCFBStat,
    recordNBAStat,
    recordStats,
    NBAstats,
    NFLstats,
    getPlayerStats
}