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
    fetchNBAGameSummary
} = require('../services/eventService');
const PlayerStat = require('../models/PlayerStat');

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
const recordStats = async () => {
    const events = await Event.find({state: 3, saveStats: 0});
    for(const event of events){
        if (String(event.sportId) == '650e0b6fb80ab879d1c142c8') {
            console.log("NFL " + event._id);
            await recordNFLStat(event);
        }
        else if (String(event.sportId) == String('65108fcf4fa2698548371fc0')) {
            console.log("MLB " + event._id);
            await recordMLBStat(event);
        }
        else if (String(event.sportId) == '65131974db50d0c2c8bf7aa7') {
            console.log("Soccer " + event._id);
            await recordSoccerStat(event);
        }
        else if (String(event.sportId) == '65108faf4fa2698548371fbd') {
            console.log("NHL " + event._id);
            await recordNHLStat(event);
        } else if ((String(event.sportId) == '652f31fdfb0c776ae3db47e1')) {
            console.log("CFB " + event._id);
            await recordCFBStat(event);
        }
        else if ((String(event.sportId) == '64f78bc5d0686ac7cf1a6855')) {
            console.log("NBA " + event._id);
            await recordNBAStat(event);
        }
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
    NFLstats
}