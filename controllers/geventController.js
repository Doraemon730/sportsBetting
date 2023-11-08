const Event = require('../models/Event');
const Player = require('../models/Player');
const CFPlayer = require('../models/CFPlayer');
const Prop = require('../models/Prop');
const User = require('../models/User');
const Team = require('../models/Team');
const Bet = require('../models/Bet');

const axios = require('axios');
const {
    fetchNBAMatchData,
    fetchNFLMatchData,
    fetchNBAEventsFromGoal
} = require('../services/eventService');
const {
    ObjectId
} = require("mongodb");
const {confirmArray} = require('../utils/util');

const getNBAMatchData = async () => {
    let matchData = fetchNBAMatchData();
}

const getNFLMatchData = async () => {
    let matchData = fetchNFLMatchData();
}


const getNBAEventsfromGoal = async (req, res) => {
    try{
        let matches = await fetchNBAEventsFromGoal();
        for(let day of matches) {
            let match = confirmArray(day.match);
            if(match.length == 0)
                continue;
            for(let game of match) {
                let myEvent = new Event({
                    id:game.id,
                    startTime: gaem.datetime_utc,
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
                await myEvent.save();
                let types = game.odds.types.filter((obj) => obj.bookmaker != undefined);
                for(let type of types) {
                    let odds = type.bookmaker.odd;
                    let result = odds.map(item => {
                        let name = item.name.split(/ (\w+:)/)[0];
                        let condition = item.name.split(/ (\w+:)/)[1].replace(':', '');
                        let value = item.name.split(/ (\w+:)/)[2].replace(':', '');;
                      
                        return {
                            name,
                            condition,
                            value : parseFloat(value),
                            us: item.us
                        };
                      });
                    let arr = new Array(result.length).fill(1);
                    let prop = await Prop.findOne({srId:type.id, sportId: new ObjectId('64f78bc5d0686ac7cf1a6855')});
                    for(let i = 0; i < result.length; i ++) {
                        if(arr[i] == 1) {
                            arr[i] = 0;
                            let name = result[i].name;
                            let nextIndex = result.findIndex(odd => odd.name == name && odd.condition != result[i].condition);
                            console.log(nextIndex);
                            arr[nextIndex] = 0;
                            let diff = Math.abs(Math.abs(result[i].us) - Math.abs(result[nextIndex].us));
                            if(diff > 30)
                                continue;
                            let player = await Player.findOne({name: name});
                            if(!player)
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
    } catch (error) {
      console.log(error);
      res.status(500).send('Server Error');
    }
}
module.exports = {
    getNBAMatchData,
    getNFLMatchData,
    getNBAEventsfromGoal
}