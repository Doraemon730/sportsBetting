const Event = require('../models/Event');
const Player = require('../models/Player');
const CFPlayer = require('../models/CFPlayer');
const Prop = require('../models/Prop');
const User = require('../models/User');
const Team = require('../models/Team');
const Bet = require('../models/Bet');
const { updateCapital } = require('./capitalController');
const { updateBetResult, updateTotalBalanceAndCredits } = require('./statisticsController');
require('../utils/log');
const request = require('request')
const {
    NFL_LIVEDATA_BASEURL,
    MLB_LIVEDATA_BASEURL,
    NHL_LIVEDATA_BASEURL,
    CFB_LIVEDATA_BASEURL
} = require('../config/constant');
const {
    ObjectId
} = require("mongodb");
const {
    fetchWeeklyEventsNFL,
    fetchWeeklyEventsNHL,
    fetchEventPlayerProps,
    fetchEventMapping,
    fetchWeeklyEventsMLB,
    fetchPlayerMapping,
    fetchNFLGameSummary,
    fetchSoccerPlayerProps,
    fetchWeeklyEventsUEFA,
    fetchWeeklyEventsLaLiga,
    fetchWeeklyEventsPremierLeague,
    fetchWeeklyEventsSerieA,
    fetchWeeklyEventsLigue1,
    fetchWeeklyEventsBundesliga,
    fetchWeeklyEventsMLS,
    fetchWeeklyEventsSaudi,
    fetchMLBGameSummary,
    fetchSoccerEventSummary,
    fetchNHLGameSummary,
    fetchWeeklyEventsCFB,
    fetchCFBGameSummary,
    fetchWeeklyEventsNBA
} = require('../services/eventService');

const { USD2Ether, Ether2USD } = require('../utils/util');
const {
    BET_2_2_HIGH,
    BET_3_3_HIGH,
    BET_2_3_LOW,
    BET_3_3_LOW,
    BET_3_4_LOW,
    BET_4_4_HIGH,
    BET_3_5_LOW,
    BET_4_5_LOW,
    BET_5_5_LOW,
    BET_4_6_LOW,
    BET_5_6_LOW,
    BET_6_6_LOW
} = require('../config/constant');
const {
    fetchSoccerPlayerProfile
} = require('../services/playerService');
const { addPrizeTransaction } = require('./transactionController.js');
const NFL_API_KEY = process.env.NFL_API_KEY;
const MLB_API_KEY = process.env.MLB_API_KEY;
const NHL_API_KEY = process.env.NHL_API_KEY;
const CFB_API_KEY = process.env.NCAA_API_KEY;
const mutex = require('async-mutex')
const lock = new mutex.Mutex();

let players = [];

const playerMapping = async () => {
    players = await fetchPlayerMapping(0);
    players = players.concat(await fetchPlayerMapping(30001));
    players = players.concat(await fetchPlayerMapping(60001));
    players = players.concat(await fetchPlayerMapping(90001));
    players = players.concat(await fetchPlayerMapping(120001));
    players = players.concat(await fetchPlayerMapping(150001));
    players = players.concat(await fetchPlayerMapping(180001));
    players = players.concat(await fetchPlayerMapping(210001));
    players = players.concat(await fetchPlayerMapping(240001));
    return;
}
const getWeeklyEventsNFL = async () => {
    try {
        const mappings = await fetchEventMapping();
        if (!mappings || !Array.isArray(mappings)) {
            console.log("no mappings");
            return;
        }
        let events = await fetchWeeklyEventsNFL();
        //console.log("NFL events count =" + events.length);

        let now = new Date();
        events = events.filter(item => new Date(item.sport_event.start_time) > now);
        console.log("NFL events count =" + events.length);
        for (const event of events) {

            let myEvent = new Event({
                id: event.sport_event.id,
                startTime: event.sport_event.start_time,
                sportId: new ObjectId('650e0b6fb80ab879d1c142c8')
            });
            let alias = [];
            for (const competitor of event.sport_event.competitors) {
                const team = await Team.findOne({
                    srId: competitor.id
                });
                competitor.teamId = team._id;
                myEvent.competitors.push(competitor);
                alias.push(team.alias);
            }
            myEvent.name = alias[0] + " vs " + alias[1];

            const mapping = mappings.find(item => item.id == event.sport_event.id);
            if (mapping)
                myEvent.matchId = mapping.external_id;


            const playerProps = await fetchEventPlayerProps(event.sport_event.id);
            console.log('EventController.js/getWeeklyEventsNFL/92 eventId = ' + event.sport_event.id);
            if (!playerProps)
                continue;
            const existingEvent = await Event.findOne({ sportId: new ObjectId('650e0b6fb80ab879d1c142c8'), id: event.sport_event.id });
            if (existingEvent) {
                myEvent = existingEvent;
                existingEvent.startTime = myEvent.startTime;
                await existingEvent.save();
            } else {
                await myEvent.save();
                console.log('NFL New event inserted! _id=' + myEvent.id);
            }
            if ('markets' in playerProps)
                continue;
            //await myEvent.save();
            for (const playerProp of playerProps) {
                //console.log(playerProp.player.id);
                if (!playerProp.player.id)
                    continue;
                const player = await Player.findOne({
                    srId: playerProp.player.id,
                    sportId: new ObjectId('650e0b6fb80ab879d1c142c8')
                });
                if (!player)
                    continue;
                for (const market of playerProp.markets) {
                    const prop = await Prop.findOne({
                        srId: market.id,
                        sportId: new ObjectId('650e0b6fb80ab879d1c142c8')
                    });
                    if (!player || !prop) continue;
                    let book = market.books.find(item => item.name == "FanDuel");
                    if(book == undefined)
                        continue;
                    let outcomes = book.outcomes;                    
                    let odd1 = Math.abs(parseInt(outcomes[0].odds_american));
                    let odd2 = Math.abs(parseInt(outcomes[1].odds_american));
                    let odd = Math.abs(odd1 - odd2);
                    const index = player.odds.findIndex(odd => String(odd.id) == String(prop._id));
                    if (odd <= 20) {
                        //console.log(market);
                        console.log(playerProp.player.name);
                        if (index !== -1) {
                            player.odds[index].value = outcomes[0].open_total;
                            player.odds[index].event = myEvent._id;
                        } else {
                            player.odds.push({
                                id: prop._id,
                                value: outcomes[0].open_total,
                                event: myEvent._id
                            });
                        }
                    } else if (index != -1) {
                        player.odds.splice(index, 1);
                    }
                }
                await player.save();
            }


        }
        console.log("Get NFL Events and update finished at " + new Date().toString());
    } catch (error) {
        console.log(error);

    }
}
const getWeeklyEventsNHL = async () => {
    try {
        const mappings = await fetchEventMapping();
        if (!mappings || !Array.isArray(mappings)) {
            console.log("no mappings");
            return;
        }
        let events = await fetchWeeklyEventsNHL();
        //console.log("NFL events count =" + events.length);

        let now = new Date();
        events = events.filter(item => new Date(item.sport_event.start_time) > now);
        console.log("NHL events count =" + events.length);
        for (const event of events) {

            let myEvent = new Event({
                id: event.sport_event.id,
                startTime: event.sport_event.start_time,
                sportId: new ObjectId('65108faf4fa2698548371fbd')
            });
            let alias = [];
            for (const competitor of event.sport_event.competitors) {
                const team = await Team.findOne({
                    sportId: new ObjectId('65108faf4fa2698548371fbd'),
                    alias: competitor.abbreviation
                });
                competitor.teamId = team._id;
                myEvent.competitors.push(competitor);
                alias.push(team.alias);
            }
            myEvent.name = alias[0] + " vs " + alias[1];

            const mapping = mappings.find(item => item.id == event.sport_event.id);
            if (mapping)
                myEvent.matchId = mapping.external_id;


            const playerProps = await fetchEventPlayerProps(event.sport_event.id);
            console.log(' eventId = ' + event.sport_event.id);
            if (!playerProps)
                continue;
            const existingEvent = await Event.findOne({ sportId: new ObjectId('65108faf4fa2698548371fbd'), id: event.sport_event.id });
            if (existingEvent) {
                myEvent = existingEvent;
                existingEvent.startTime = myEvent.startTime;
                await existingEvent.save();
            } else {
                await myEvent.save();
                console.log('NHL New event inserted! _id=' + myEvent.id);
            }
            if ('markets' in playerProps)
                continue;
            //await myEvent.save();
            for (const playerProp of playerProps) {
                //console.log(playerProp.player.id);
                if (!playerProp.player.id)
                    continue;
                const player = await Player.findOne({
                    srId: playerProp.player.id,
                    sportId: new ObjectId('65108faf4fa2698548371fbd')
                });
                if (!player)
                    continue;
                for (const market of playerProp.markets) {
                    const prop = await Prop.findOne({
                        srId: market.id,
                        sportId: new ObjectId('65108faf4fa2698548371fbd')
                    });
                    if (!player || !prop) continue;
                    let book = market.books.find(item => item.name == "FanDuel");
                    if(book == undefined)
                        continue;
                    let outcomes = book.outcomes;                    
                    let odd1 = Math.abs(parseInt(outcomes[0].odds_american));
                    let odd2 = Math.abs(parseInt(outcomes[1].odds_american));
                    let odd = Math.abs(odd1 - odd2);
                    const index = player.odds.findIndex(odd => String(odd.id) == String(prop._id));
                    if (odd <= 20) {
                        //console.log(market);
                        console.log(playerProp.player.name);
                        if (index !== -1) {
                            player.odds[index].value = outcomes[0].open_total;
                            player.odds[index].event = myEvent._id;
                        } else {
                            player.odds.push({
                                id: prop._id,
                                value: outcomes[0].open_total,
                                event: myEvent._id
                            });
                        }
                    } else if (index != -1) {
                        player.odds.splice(index, 1);
                    }
                }
                await player.save();
            }


        }
        console.log("Get NHL Events and update finished at " + new Date().toString());
    } catch (error) {
        console.log(error);

    }
}
const getWeeklyEventsMLB = async () => {
    try {
        const mappings = await fetchEventMapping();
        if (!mappings || !Array.isArray(mappings)) {
            console.log('No mappings');
            return;
        }
        //console.log(mappings);
        if (players.length == 0)
            await playerMapping();
        console.log(JSON.stringify(players[0]));

        let events = await fetchWeeklyEventsMLB();
        let now = new Date();
        events = events.filter(item => new Date(item.sport_event.start_time) > now);
        console.log("MLB events count = " + events.length);
        for (const event of events) {

            let myEvent = new Event({
                id: event.sport_event.id,
                startTime: event.sport_event.start_time,
                sportId: new ObjectId('65108fcf4fa2698548371fc0')
            });
            let alias = [];
            for (const competitor of event.sport_event.competitors) {
                const team = await Team.findOne({
                    sportId: new ObjectId('65108fcf4fa2698548371fc0'),
                    alias: competitor.abbreviation
                });
                competitor.teamId = team._id;
                myEvent.competitors.push(competitor);
                alias.push(team.alias);
            }
            myEvent.name = alias[0] + " vs " + alias[1];

            let mapping = mappings.find(item => item.id == event.sport_event.id);
            if (mapping)
                myEvent.matchId = mapping.external_id;


            let playerProps = await fetchEventPlayerProps(event.sport_event.id);
            let existingEvent = await Event.findOne({ sportId: new ObjectId('65108fcf4fa2698548371fc0'), id: event.sport_event.id });
            if (existingEvent) {
                myEvent = existingEvent;
                existingEvent.startTime = myEvent.startTime;
                await existingEvent.save();
            } else {
                // Event doesn't exist, insert new event
                await myEvent.save();
                console.log('MLB New event inserted! _id=' + myEvent.id);
            }
            //await myEvent.save();
            //console.log(playerProps);
            if (!playerProps)
                continue;

            for (const playerProp of playerProps) {
                console.log(playerProp.player.id, true);
                console.log(playerProp.player.name, true);
                const play = players.find(item => String(item.id) == String(playerProp.player.id));

                if (!play)
                    continue;
                const player = await Player.findOne({
                    remoteId: play.us_id,
                    sportId: new ObjectId('65108fcf4fa2698548371fc0')
                });
                if (!player)
                    continue;
                console.log(player);
                for (const market of playerProp.markets) {
                    const prop = await Prop.findOne({
                        srId: market.id,
                        sportId: new ObjectId('65108fcf4fa2698548371fc0')
                    });
                    if (!prop) continue;
                    const index = player.odds.findIndex((odd) => String(odd.id) == String(prop._id));
                    console.log(JSON.stringify(market));
                    let book = market.books.find(item => item.name == "FanDuel");
                    if(book == undefined)
                        continue;
                    let outcomes = book.outcomes;
                    console.log(playerProp.player.name);
                    let odd1 = Math.abs(parseInt(outcomes[0].odds_american));
                    let odd2 = Math.abs(parseInt(outcomes[1].odds_american));
                    let odd = Math.abs(odd1 - odd2);
                    console.log(odd1);
                    console.log(odd2);
                    if (odd <= 20) {
                        console.log(playerProp.player.name);
                        if (index !== -1) {
                            player.odds[index].value = outcomes[0].open_total;
                            player.odds[index].event = myEvent._id;
                        } else {
                            player.odds.push({
                                id: prop._id,
                                value: outcomes[0].open_total,
                                event: myEvent._id
                            });
                        }
                    } else if (index != -1) {
                        player.odds.splice(index, 1);
                    }

                }
                await player.save();
            }
            //console.log(playerProps);

        }
        console.log("Get MLB Events and update finished at " + new Date().toString());
    } catch (error) {
        console.log(error);

    }
};
const getWeeklyEventsCFB = async () => {
    try {
        const mappings = await fetchEventMapping();
        if (!mappings || !Array.isArray(mappings)) {
            console.log('No mappings');
            return;
        }
        //console.log(mappings);
        if (players.length == 0)
            await playerMapping();
        console.log(JSON.stringify(players[0]));

        let events = await fetchWeeklyEventsCFB();
        let now = new Date();
        events = events.filter(item => new Date(item.sport_event.start_time) > now);
        console.log("CFB events count = " + events.length);
        for (const event of events) {

            let myEvent = new Event({
                id: event.sport_event.id,
                startTime: event.sport_event.start_time,
                sportId: new ObjectId('652f31fdfb0c776ae3db47e1')
            });
            let alias = [], inc = 0;
            for (const competitor of event.sport_event.competitors) {
                const team = await Team.findOne({
                    sportId: new ObjectId('652f31fdfb0c776ae3db47e1'),
                    alias: competitor.abbreviation
                });
                if (team) {
                    competitor.teamId = team._id;
                    inc += 1;
                }
                myEvent.competitors.push(competitor);
                alias.push(competitor.abbreviation);
            }
            if (inc == 0)
                continue;
            myEvent.name = alias[0] + " vs " + alias[1];

            let mapping = mappings.find(item => item.id == event.sport_event.id);
            if (mapping)
                myEvent.matchId = mapping.external_id;


            let playerProps = await fetchEventPlayerProps(event.sport_event.id);
            if (!playerProps || 'markets' in playerProps)
                continue;
            let existingEvent = await Event.findOne({ sportId: new ObjectId('652f31fdfb0c776ae3db47e1'), id: event.sport_event.id });
            if (existingEvent) {
                myEvent = existingEvent;
                existingEvent.startTime = myEvent.startTime;
                await existingEvent.save();
            } else {
                // Event doesn't exist, insert new event
                await myEvent.save();
                console.log('CFB New event inserted! _id=' + myEvent.id);
            }
            //await myEvent.save();
            //console.log(playerProps);


            for (const playerProp of playerProps) {
                console.log(playerProp.player.id, true);
                console.log(playerProp.player.name, true);
                const play = players.find(item => String(item.id) == String(playerProp.player.id));

                if (!play)
                    continue;
                const player = await Player.findOne({
                    remoteId: play.us_id,
                    sportId: new ObjectId('652f31fdfb0c776ae3db47e1')
                });
                if (!player)
                    continue;
                console.log(player);
                for (const market of playerProp.markets) {
                    const prop = await Prop.findOne({
                        srId: market.id,
                        sportId: new ObjectId('652f31fdfb0c776ae3db47e1')
                    });
                    if (!prop) continue;
                    const index = player.odds.findIndex((odd) => String(odd.id) == String(prop._id));
                    console.log(JSON.stringify(market));
                    let book = market.books.find(item => item.name == "FanDuel");
                    if(book == undefined)
                        continue;
                    let outcomes = book.outcomes;
                    console.log(playerProp.player.name);
                    let odd1 = Math.abs(parseInt(outcomes[0].odds_american));
                    let odd2 = Math.abs(parseInt(outcomes[1].odds_american));
                    let odd = Math.abs(odd1 - odd2);
                    console.log(odd1);
                    console.log(odd2);
                    if (odd <= 20) {
                        console.log(playerProp.player.name);
                        if (index !== -1) {
                            player.odds[index].value = outcomes[0].open_total;
                            player.odds[index].event = myEvent._id;
                        } else {
                            player.odds.push({
                                id: prop._id,
                                value: outcomes[0].open_total,
                                event: myEvent._id
                            });
                        }
                    } else if (index != -1) {
                        player.odds.splice(index, 1);
                    }

                }
                await player.save();
            }
            //console.log(playerProps);

        }
        console.log("Get CFB Events and update finished at " + new Date().toString());
    } catch (error) {
        console.log(error);

    }
};

const getWeeklyEventsNBA = async () => {
    try {
        const mappings = await fetchEventMapping();
        if (!mappings || !Array.isArray(mappings)) {
            console.log('No mappings');
            return;
        }
        //console.log(mappings);        

        let events = await fetchWeeklyEventsNBA();
        let now = new Date();
        events = events.filter(item => new Date(item.sport_event.start_time) > now);
        console.log("NBA events count = " + events.length);
        for (const event of events) {

            let myEvent = new Event({
                id: event.sport_event.id,
                startTime: event.sport_event.start_time,
                sportId: new ObjectId('64f78bc5d0686ac7cf1a6855')
            });
            let alias = [], inc = 0;
            for (const competitor of event.sport_event.competitors) {
                const team = await Team.findOne({
                    sportId: new ObjectId('64f78bc5d0686ac7cf1a6855'),
                    alias: competitor.abbreviation
                });
                competitor.teamId = team._id;
                myEvent.competitors.push(competitor);
                alias.push(team.alias);
            }
            myEvent.name = alias[0] + " vs " + alias[1];          

            let mapping = mappings.find(item => item.id == event.sport_event.id);
            if (mapping)
                myEvent.matchId = mapping.external_id;


            let playerProps = await fetchEventPlayerProps(event.sport_event.id);
            if (!playerProps || 'markets' in playerProps)
                continue;
            let existingEvent = await Event.findOne({ sportId: new ObjectId('64f78bc5d0686ac7cf1a6855'), id: event.sport_event.id });
            if (existingEvent) {
                myEvent = existingEvent;
                existingEvent.startTime = myEvent.startTime;
                await existingEvent.save();
            } else {
                // Event doesn't exist, insert new event
                await myEvent.save();
                console.log('NBA New event inserted! _id=' + myEvent.id);
            }
            //await myEvent.save();
            //console.log(playerProps);


            for (const playerProp of playerProps) {
                console.log(playerProp.player.id, true);
                console.log(playerProp.player.name, true);
                //const play = players.find(item => String(item.id) == String(playerProp.player.id));


                const player = await Player.findOne({
                    srId: playerProp.player.id,
                    sportId: new ObjectId('64f78bc5d0686ac7cf1a6855')
                });
                if (!player)
                    continue;
                console.log(player);
                for (const market of playerProp.markets) {
                    const prop = await Prop.findOne({
                        srId: market.id,
                        sportId: new ObjectId('64f78bc5d0686ac7cf1a6855')
                    });
                    if (!prop) continue;
                    const index = player.odds.findIndex((odd) => String(odd.id) == String(prop._id));
                    console.log(JSON.stringify(market));
                    console.log(playerProp.player.name);
                    let minOdds = 100, minIndex = -1, total = -1;

                    // for(let i = 0; i < market.books.length; i ++){
                    //     let outcomes = market.books[i].outcomes;
                    //     let odd1 = Math.abs(parseInt(outcomes[0].odds_american));
                    //     let odd2 = Math.abs(parseInt(outcomes[1].odds_american));
                    //     let odd = Math.abs(odd1 - odd2);
                    //     console.log(market.books[i].name + ": " +odd1 + " " + odd2 + " " + odd);
                    //     if(odd < minOdds){
                    //         minOdds = odd;
                    //         minIndex = i;
                    //         total = outcomes[0].open_total;
                    //         if(minOdds == 0)
                    //             break;
                    //     }
                    // }
                    // console.log(minOdds + " " + minIndex + " " + total);
                    let book = market.books.find(item => item.name == "FanDuel");
                    if(book == undefined)
                        continue;
                    let outcomes = book.outcomes;
                    
                    let odd1 = Math.abs(parseInt(outcomes[0].odds_american));
                    let odd2 = Math.abs(parseInt(outcomes[1].odds_american));
                    let odd = Math.abs(odd1 - odd2);
                    console.log(odd1);
                    console.log(odd2);
                    if (odd <= 20) {
                        console.log(playerProp.player.name);
                        if (index !== -1) {
                            player.odds[index].value = outcomes[0].open_total;
                            player.odds[index].event = myEvent._id;
                        } else {
                            player.odds.push({
                                id: prop._id,
                                value: outcomes[0].open_total,
                                event: myEvent._id
                            });
                        }
                    } else if (index != -1) {
                        player.odds.splice(index, 1);
                    }

                }
                await player.save();
            }
            //console.log(playerProps);

        }
        console.log("Get NBA Events and update finished at " + new Date().toString());
    } catch (error) {
        console.log(error);

    }
};
const competitiorDraft = [
    "sr:competitor:2817",
    "sr:competitor:2672",
    "sr:competitor:17",
    "sr:competitor:34315",
    "sr:competitor:2714",
    "sr:competitor:2687",
    "sr:competitor:39",
    "sr:competitor:23400",
    "sr:competitor:2697",
    "sr:competitor:1644",
    "sr:competitor:44",
    "sr:competitor:1649",
    "sr:competitor:659691",
    "sr:competitor:2702",
    "sr:competitor:2829",
    "sr:competitor:35",
    "sr:competitor:2836",
    "sr:competitor:42",
    "sr:competitor:33",
    "sr:competitor:1653",
    "sr:competitor:2673"

];

const nameDraft = [
    "Lewandowski, Robert",
    "Mbappe, Kylian",
    "Haaland, Erling",
    "Benzema, Karim",
    "Osimhen, Victor",
    "Nunez, Darwin",
    "Kane, Harry",
    "Isak, Alexander",
    "Martinez, Lautaro",
    "Lacazette, Alexandre",
    "Lukaku, Romelu",
    "Messi, Lionel",
    "Ronaldo, Cristiano",
    "Felix, Joao",
    "Bellingham, Jude",
    "Hojlund, Rasmus",
    "Morata, Alvaro",
    "Jesus, Gabriel",
    "Junior, Vinicius",
    "Salah, Mohamed",
    "Ben Yedder, Wissam",
    "Haller, Sebastian"
];
const teamDraft = [
    '65150e67f9968df69b4e3322',
    '65150eaff9968df69b4e3326',
    '65150fd9f9968df69b4e3388',
    '651510bdf9968df69b4e33e8',
    '651510f2f9968df69b4e33eb',
    '65151160f9968df69b4e33ef',
    '6515133df9968df69b4e34af',
    '651513c2f9968df69b4e34b3',
    '651513fff9968df69b4e34b6',
    '6515142ef9968df69b4e3514',
    '651514d4f9968df69b4e3519',
    '65151527f9968df69b4e351c',
    '65151585f9968df69b4e357b',
    '65150d19294650b6131a48e1',
    '653221d0729d7f0201137ac6',
    '653225f2729d7f0201137ae5',
    '65322688729d7f0201137aeb',
    '65322789729d7f0201137af5',
    '653227ff729d7f0201137b86',
    '65322830729d7f0201137c12'
]
const processSoccerEvents = async (mappings, events) => {
    try {
        console.log("process Soccer Events");
        if (!events)
            return;
        console.log("Soccer events count = " + events.length, true);
        let now = new Date();
        let eventes = events.filter(item => new Date(item.sport_event.start_time) > now);
        console.log("Soccer events count = " + eventes.length, true);
        for (const event of eventes) {
            let competitors = event.sport_event.competitors;

            let myEvent = new Event({
                id: event.sport_event.id,
                startTime: event.sport_event.start_time,
                sportId: new ObjectId('65131974db50d0c2c8bf7aa7'),
                competitors: competitors
            });

            let index = competitiorDraft.indexOf(competitors[0].id);
            if (index == undefined || index == -1)
                index = competitiorDraft.indexOf(competitors[1].id);
            if (index == undefined || index == -1)
                continue;

            myEvent.name = competitors[0].abbreviation + " vs " + competitors[1].abbreviation;

            const mapping = mappings.find(item => item.id == event.sport_event.id);
            if (mapping)
                myEvent.matchId = mapping.external_id;

            const markets = await fetchSoccerPlayerProps(event.sport_event.id);
            if (!markets)
                continue;
            console.log(markets, true);
            const market = markets.find(item => item.name == "anytime goalscorer");
            if (!market)
                continue;
            console.log(market, true);
            const existingEvent = await Event.findOne({ sportId: new ObjectId('65131974db50d0c2c8bf7aa7'), id: event.sport_event.id });
            if (existingEvent) {
                // Event already exists, update it
                console.log("event already exist", true)
                myEvent = existingEvent;
                existingEvent.startTime = myEvent.startTime;
                await existingEvent.save();
            } else {
                // Event doesn't exist, insert new event
                await myEvent.save();
                console.log('Soccer New event inserted! id = ' + myEvent.id);
            }
            for (const play of market.books[0].outcomes) {
                console.log(play.player_id, true);
                if (!play || !play.player_id)
                    return;
                let odds = Math.abs(parseInt(play.odds_american));
                if (odds < 100 || odds > 120)
                    continue;
                let player = await Player.findOne({ srId: play.player_id, sportId: new ObjectId('65131974db50d0c2c8bf7aa7') });
                if (!player) {

                    const profile = await fetchSoccerPlayerProfile(play.player_id);
                    let name = profile.player.name;
                    if (nameDraft.indexOf(name) !== -1) {
                        let com = profile.competitors[0].id;
                        let i = competitiorDraft.indexOf(com);
                        if (i == -1)
                            i = competitiorDraft.indexOf(profile.competitors[1].id)

                        console.log(profile.player.name, true);
                        player = new Player({
                            sportId: new ObjectId('65131974db50d0c2c8bf7aa7'),
                            name: profile.player.name,
                            jerseyNumber: profile.player.jersey_number,
                            position: profile.player.type,
                            srId: play.player_id,
                            teamName: profile.competitors[0].abbreviation,
                            teamId: new ObjectId(teamDraft[i]),
                            headshot: profile.player.name
                        });
                        player.odds.push({
                            id: new ObjectId('65132681ccd67ffa439d6ead'),
                            value: 0.5,
                            event: myEvent._id
                        });
                        await player.save();
                    }
                }
                else {
                    console.log(player.name);
                    if (player.odds.length) {
                        player.odds[0].event = myEvent._id;
                        player.odds[0].value = 0.5;
                    } else {
                        player.odds.push({
                            id: new ObjectId('65132681ccd67ffa439d6ead'),
                            value: 0.5,
                            event: myEvent._id
                        });
                    }
                    await player.save();
                }

            }
        }
    } catch (error) {
        console.log(error);
    }
}
const getWeeklyEventsUEFA = async (mappings) => {
    try {
        let events = await fetchWeeklyEventsUEFA();
        console.log("UEFA");
        await processSoccerEvents(mappings, events);
    } catch (error) {
        console.log(error);
    }
};
const getWeeklyEventsSaudi = async (mappings) => {
    try {
        let events = await fetchWeeklyEventsSaudi();
        console.log("Saudi");
        await processSoccerEvents(mappings, events);
    } catch (error) {
        console.log(error);
    }
};
const getWeeklyEventsLaLiga = async (mappings) => {
    try {
        let events = await fetchWeeklyEventsLaLiga();
        console.log("LaLiga");
        await processSoccerEvents(mappings, events);
    } catch (error) {
        console.log(error);
    }
};
const getWeeklyEventsPremierLeague = async (mappings) => {
    try {
        let events = await fetchWeeklyEventsPremierLeague();
        console.log("PremierLeague");
        await processSoccerEvents(mappings, events);
    } catch (error) {
        console.log(error);
    }
};
const getWeeklyEventsSerieA = async (mappings) => {
    try {

        let events = await fetchWeeklyEventsSerieA();
        console.log("SerieA");
        await processSoccerEvents(mappings, events);
    } catch (error) {
        console.log(error);
    }
};
const getWeeklyEventsLigue1 = async (mappings) => {
    try {
        let events = await fetchWeeklyEventsLigue1();
        console.log("Ligue1");
        await processSoccerEvents(mappings, events);
    } catch (error) {
        console.log(error);
    }
};
const getWeeklyEventsBundesliga = async (mappings) => {
    try {
        let events = await fetchWeeklyEventsBundesliga();
        console.log("Bundesliga");
        await processSoccerEvents(mappings, events);
    } catch (error) {
        console.log(error);
    }
};
const getWeeklyEventsMLS = async (mappings) => {
    try {

        let events = await fetchWeeklyEventsMLS();
        console.log("MLS");
        await processSoccerEvents(mappings, events);
    } catch (error) {
        console.log(error);
    }
};
const getWeeklyEventsSoccer = async () => {
    try {
        const mappings = await fetchEventMapping();
        if (!mappings || !Array.isArray(mappings)) {
            console.log('no mappings');
        }
        await getWeeklyEventsUEFA(mappings);
        await getWeeklyEventsLaLiga(mappings);
        await getWeeklyEventsPremierLeague(mappings);
        await getWeeklyEventsSerieA(mappings);
        await getWeeklyEventsLigue1(mappings);
        await getWeeklyEventsBundesliga(mappings);
        await getWeeklyEventsMLS(mappings);
        await getWeeklyEventsSaudi(mappings);
        console.log("Get Soccer Events and update finished at " + new Date().toString());

    } catch (error) {
        console.log(error);

    }
};
const remove = async (req, res) => {
    try {
        await Event.deleteMany({
            sportId: new ObjectId('65108fcf4fa2698548371fc0')
        });
        res.json("Success");
    } catch (error) {
        res.status(500).send("Server Error");
    }
};

const isJSON = (str) => {
    try {
        JSON.parse(str);
        return true;
    } catch (e) {
        return false;
    }
}

const getLiveDataByEvent = async () => {
    try {
        let events = await Event.find({ state: 0, startTime: { $lte: new Date().getTime() } });
        for (const event of events) {
            url = ""
            let sportType = ""
            if (new Date().getTime() - event.startTime > 1000 * 60 * 60 * 3) {
                await Event.updateOne({
                    _id: event._id
                }, {
                    $set: {
                        state: 2
                    }
                })
                continue;
            }

            if (event.sportId == '650e0b6fb80ab879d1c142c8') {
                url = `${NFL_LIVEDATA_BASEURL}=${NFL_API_KEY}&match=sd:match:${event.matchId}`
                sportType = "NFL"
            } else if (event.sportId == '65108faf4fa2698548371fbd') {
                url = `${NHL_LIVEDATA_BASEURL}=${NHL_API_KEY}&match=sd:match:${event.matchId}`
                sportType = "NHL"
            } else if (event.sportId == '65108fcf4fa2698548371fc0') {
                url = `${MLB_LIVEDATA_BASEURL}=${MLB_API_KEY}&match=sd:match:${event.matchId}`
                sportType = "MLB"
            } else if (event.sportId == '652f31fdfb0c776ae3db47e1') {
                url = `${CFB_LIVEDATA_BASEURL}=${CFB_API_KEY}&match=sd:match:${event.matchId}`
                sportType = "CFB"
            } else {
                await Event.updateOne({
                    _id: event._id
                }, {
                    $set: {
                        state: 2
                    }
                })
                continue;
            }
            let broadcastingData = {
                contestId: event._id
            }
            const stream = request(url);
            let isCompleted = false;
            let failCount = 0;
            // let queue = Promise.resolve();
            // stream.on('data', (chunk) => {
            //     stream.pause();
            //     if (isJSON(chunk.toString())) {
            //         const jsonData = JSON.parse(chunk.toString());
            //         if (jsonData.hasOwnProperty('payload')) {
            //             failCount = 0;
            //             queue = queue.then(() => processData(jsonData, event._id, sportType)).finally(async () => {
            //                 if (jsonData.hasOwnProperty('metadata')) {
            //                     const metadata = jsonData['metadata'];
            //                     if (metadata['status'] == 'complete') {
            //                         isCompleted = true;
            //                     }
            //                 }

            //                 if (isCompleted && jsonData.hasOwnProperty('heartbeat')) {
            //                     return await Event.updateOne({ _id: event._id }, { $set: { state: 2 } });
            //                 }

            //                 if (!isCompleted && jsonData.hasOwnProperty('heartbeat')) {
            //                     failCount++;
            //                     if (failCount > 300) {
            //                         return await Event.updateOne({ _id: event._id }, { $set: { state: 2 } });
            //                     }
            //                 }

            //                 stream.resume();
            //             }).catch((error) => {
            //                 console.error('Error:', error);
            //                 Event.updateOne({ _id: event._id }, { $set: { state: 2 } });
            //                 stream.destroy();
            //             });
            //         } else {
            //             stream.resume();
            //         }
            //     };
            // });
            stream.on('data', async (chunk) => {
                // Process the incoming data chunk here
                if (event.state == 0) {
                    await Event.updateOne({
                        _id: event._id
                    }, {
                        $set: {
                            state: 1
                        }
                    })
                }
                // stream.pause();
                if (isJSON(chunk.toString())) {
                    // console.log(chunk.toString());
                    const jsonData = JSON.parse(chunk.toString());
                    if (jsonData.hasOwnProperty('payload')) {
                        failCount = 0;

                        const detailData = jsonData['payload'];
                        if (detailData.hasOwnProperty('player')) {
                            if (sportType == "NFL") {
                                broadcastingData.player = getNFLData(detailData);
                                console.log(JSON.stringify(broadcastingData))
                                global.io.sockets.emit('broadcast', { broadcastingData });
                                await setLiveDatatoDB(broadcastingData);
                            }
                            if (sportType == "NHL") {
                                broadcastingData.player = getNHLData(detailData);
                                console.log(JSON.stringify(broadcastingData))
                                global.io.sockets.emit('broadcast', { broadcastingData });
                                await setLiveDatatoDB(broadcastingData)
                            }
                            if (sportType == "MLB") {
                                if (detailData.player.hasOwnProperty('statistics')) {
                                    broadcastingData.player = getMLBData(detailData.player);
                                    console.log(JSON.stringify(broadcastingData))
                                    global.io.sockets.emit('broadcast', { broadcastingData });
                                    await setLiveDatatoDB(broadcastingData)
                                }
                            }
                            if (sportType == "CFB") {
                                broadcastingData.player = getCFBData(detailData);
                                console.log(JSON.stringify(broadcastingData))
                                global.io.sockets.emit('broadcast', { broadcastingData });
                                await setLiveDatatoDB(broadcastingData)
                            }
                        }
                    }
                    if (jsonData.hasOwnProperty('metadata')) {
                        const metadata = jsonData['metadata'];
                        if (metadata['status'] == 'complete') {
                            isCompleted = true;
                        }
                    }
                    if (isCompleted && jsonData.hasOwnProperty('heartbeat')) {
                        await Event.updateOne({
                            _id: event._id
                        }, {
                            $set: {
                                state: 2
                            }
                        });
                        //updateBet(event._id);
                        stream.abort();
                    }
                    if (!isCompleted && jsonData.hasOwnProperty('heartbeat')) {
                        failCount++;
                        if (failCount > 300) {
                            await Event.updateOne({
                                _id: event._id
                            }, {
                                $set: {
                                    state: 2
                                }
                            });
                            stream.abort();
                        }
                    }
                }
                // stream.resume();
            });
            // Handle errors
            stream.on('error', async (error) => {
                console.error('Error:', error);
                await Event.updateOne({
                    _id: event._id
                }, {
                    $set: {
                        state: 2
                    }
                });
                stream.destroy();
            });

            // Handle the end of the stream
            stream.on('end', async () => {
                console.log('Stream ended');
                await Event.updateOne({
                    _id: event._id
                }, {
                    $set: {
                        state: 2
                    }
                });
                stream.destroy();
            });


        }
    } catch (error) {
        //throw new Error(error.message);
        console.log(error);
    }
}

async function processData(jsonData, event_id, sportType) {
    let broadcastingData = {
        contestId: event_id
    }
    const detailData = jsonData['payload'];
    if (detailData.hasOwnProperty('player')) {
        if (sportType == "NFL") {
            broadcastingData.player = getNFLData(detailData);
            console.log(JSON.stringify(broadcastingData))
            global.io.sockets.emit('broadcast', { broadcastingData });
            await setLiveDatatoDB(broadcastingData);
        }
        if (sportType == "NHL") {
            broadcastingData.player = getNHLData(detailData);
            console.log(JSON.stringify(broadcastingData))
            global.io.sockets.emit('broadcast', { broadcastingData });
            await setLiveDatatoDB(broadcastingData)
        }
        if (sportType == "MLB") {
            if (detailData.player.hasOwnProperty('statistics')) {
                broadcastingData.player = getMLBData(detailData.player);
                console.log(JSON.stringify(broadcastingData))
                global.io.sockets.emit('broadcast', { broadcastingData });
                await setLiveDatatoDB(broadcastingData)
            }
        }

        if (sportType == "CFB") {
            broadcastingData.player = getCFBData(detailData);
            console.log(JSON.stringify(broadcastingData))
            await setLiveDatatoDB(broadcastingData)
            global.io.sockets.emit('broadcast', { broadcastingData });
        }
    }
}
const setLiveDatatoDB = async (broadcastingData) => {
    const release = await lock.acquire();
    try {
        let bets = [];
        console.log(broadcastingData.player.remoteId);
        bets = await Bet.find({
            status: 'pending',
            'picks.remoteId': broadcastingData.player.remoteId
        });
        console.log(bets);
        //console.log(JSON.stringify(bets));
        for (let bet of bets) {
            let index = bet.picks.findIndex(item => item.remoteId == broadcastingData.player.remoteId)
            console.log(bet)
            console.log(broadcastingData.player.remoteId)
            console.log(index)
            if (index >= 0) {
                let propName = bet.picks[index].prop.propName;
                if (broadcastingData.player[propName] != undefined) {
                    if (broadcastingData.player[propName] > bet.picks[index].liveData) {
                        bet.picks[index].liveData = broadcastingData.player[propName]
                        console.log(bet.picks[index].liveData);
                        await bet.save();
                    }
                }
            }
        }
    } catch (error) {
        console.log(error);
    } finally {
        release();
    }
}
const testlive = async (req, res) => {
    try {
        let { remoteId } = req.body;
        let bets = await setLiveDatatoDBTest(remoteId);
        res.json(bets);
    } catch (error) {
        console.log(error);
    }
}
const setLiveDatatoDBTest = async (remoteId) => {
    try {
        let bets = await Bet.find({
            status: 'pending',
            'picks.remoteId': remoteId
        });

        for (let bet of bets) {
            let index = bet.picks.findIndex(item => item.remoteId == remoteId)
            console.log(bet)
            console.log(remoteId)
            console.log(index)
            // if (index >= 0) {
            //     console.log(index);
            //     // let propName = bet.picks[index].prop.propName;
            //     // if (broadcastingData.player[propName] != undefined) {
            //     //     bet.picks[index].liveData = broadcastingData.player[propName]
            //     //     await bet.save();
            //     // }
            // }
        }
        return bets;
    } catch (error) {
        console.log(error);
    }
}
const getNFLData = (detailData) => {
    const player = {
        remoteId: detailData.player.id,
        name: detailData.player.name
    }
    if (detailData.hasOwnProperty('rushing')) {
        player['Rush Yards'] = detailData.rushing.yards;
    }
    if (detailData.hasOwnProperty('passing')) {
        player['Pass Yards'] = detailData.passing.yards;
        player['Pass Attempts'] = detailData.passing.attempts;
        player['Pass Completions'] = detailData.passing.completions;
        player['Pass TDs'] = detailData.passing.touchdowns;
        player['INT'] = detailData.passing.interceptions;
    }
    if (detailData.hasOwnProperty('receiving')) {
        player['Receving Yards'] = detailData.receiving.yards;
        player['Receptions'] = detailData.receiving.receptions;
    }
    if (detailData.hasOwnProperty('field-goals')) {
        player['FG Made'] = detailData.field_goals.made;
    }
    if (detailData.hasOwnProperty('defense')) {
        player['Tackles+Ast'] = detailData.defense.tackles + detailData.defense.assists;
    }
    return player;
}

const getNHLData = (detailData) => {
    const player = {
        remoteId: detailData.player.id,
        name: detailData.player.full_name
    }
    player['Total Shots'] = detailData.player.statistics.total.shots;
    player['Total Assists'] = detailData.player.statistics.total.assists;
    player['Total Points'] = detailData.player.statistics.total.points;
    player['Total Power Play Points'] = detailData.player.statistics.powerplay.goals + detailData.player.statistics.powerplay.assists;
    return player;
}

const getMLBData = (detailData) => {
    const player = {
        remoteId: detailData.id,
        name: detailData.first_name + " " + detailData.last_name
    }
    if (detailData.statistics.hasOwnProperty('pitching')) {
        player['Pitcher Strikeouts'] = detailData.statistics.pitching.overall.outs.ktotal ?
            detailData.statistics.pitching.overall.outs.ktotal : 0;
        player['Total Bases'] = detailData.statistics.pitching.overall.onbase.tb ?
            detailData.statistics.pitching.overall.onbase.tb : 0;
        player['Earned Runs'] = detailData.statistics.pitching.overall.runs.earned ?
            detailData.statistics.pitching.overall.runs.earned : 0;
        player['Total Hits'] = detailData.statistics.pitching.overall.onbase.h ?
            detailData.statistics.pitching.overall.onbase.h : 0;
        player['Total Runs'] = detailData.statistics.pitching.overall.runs.total ?
            detailData.statistics.pitching.overall.runs.total : 0;
        player['Hits Allowed'] = detailData.statistics.pitching.overall.onbase.h ?
            detailData.statistics.pitching.overall.onbase.h : 0;
        player['Pitching Outs'] = detailData.statistics.pitching.overall.ip_1 ?
            detailData.statistics.pitching.overall.ip_1 : 0;
    }
    if (detailData.statistics.hasOwnProperty('hitting')) {
        player['Pitcher Strikeouts'] = detailData.statistics.hitting.overall.outs.ktotal ?
            detailData.statistics.hitting.overall.outs.ktotal : 0;
        player['Total Bases'] = detailData.statistics.hitting.overall.onbase.tb ?
            detailData.statistics.hitting.overall.onbase.tb : 0;
        player['Earned Runs'] = detailData.statistics.hitting.overall.runs.earned ?
            detailData.statistics.hitting.overall.runs.earned : 0;
        player['Total Hits'] = detailData.statistics.hitting.overall.onbase.h ?
            detailData.statistics.hitting.overall.onbase.h : 0;
        player['Total Runs'] = detailData.statistics.hitting.overall.runs.total ?
            detailData.statistics.hitting.overall.runs.total : 0;
        player['Hits Allowed'] = detailData.statistics.hitting.overall.onbase.h ?
            detailData.statistics.hitting.overall.onbase.h : 0;
        player['Pitching Outs'] = detailData.statistics.hitting.overall.ip_1 ?
            detailData.statistics.hitting.overall.ip_1 : 0;
    }

    return player;
};

const getCFBData = (detailData) => {
    const player = {
        remoteId: detailData.player.id,
        name: detailData.player.name
    }
    if (detailData.hasOwnProperty('rushing')) {
        player['Rush Yards'] = detailData.rushing.yards;
    }
    if (detailData.hasOwnProperty('passing')) {
        player['Pass Yards'] = detailData.passing.yards;
        player['Pass TDs'] = detailData.passing.touchdowns;
    }
    if (detailData.hasOwnProperty('receiving')) {
        player['Receving Yards'] = detailData.receiving.yards;
    }
    return player;
}

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

const updateNFLBet = async (event) => {
    try {
        console.log(event.matchId, true);
        const statistics = await fetchNFLGameSummary(event.matchId);
        console.log("summaryNFL" + event._id, true);
        console.log(statistics.status, true);
        if (statistics.status != "closed" && statistics.status != "complete")
            return;

        const rushingStats = summarizeStatsByPlayer(statistics, 'rushing');
        const receivingStats = summarizeStatsByPlayer(statistics, 'receiving');
        const passingStats = summarizeStatsByPlayer(statistics, 'passing');
        const fieldGoalStats = summarizeStatsByPlayer(statistics, 'field_goals');
        const defenseStats = summarizeStatsByPlayer(statistics, 'defense');

        console.log("bets " + event.participants, true);
        for (const betId of event.participants) {
            let bet = await Bet.findById(betId);
            //const pick = bet.picks.find(item => item.contestId == event._id);
            if (!bet || bet.status != 'pending')
                continue;
            console.log("id" + bet._id);
            let finished = 0, win = 0, refund = 0, lost = 0;
            for (const pick of bet.picks) {
                if (String(pick.contestId) == String(event._id)) {
                    let result, play;
                    const player = await Player.findById(pick.playerId);

                    console.log("player " + player);
                    // let index = player.odds.find(item=> String(item.event) == String(event._id));
                    // if(index == undefined || index == -1)
                    // {
                    //     refund = 1;
                    //     break;
                    // }
                    switch (pick.prop.propName) {
                        case 'Rush Yards':
                            play = rushingStats.find(item => item.id == player.remoteId);
                            if (play)
                                result = play.yards;
                            break;
                        case 'Pass Yards':
                            play = passingStats.find(item => item.id == player.remoteId);
                            if (play)
                                result = play.yards;
                            break;
                        case 'Pass Attempts':
                            play = passingStats.find(item => item.id == player.remoteId);
                            if (play)
                                result = play.attempts;
                            break;
                        case 'Pass Completions':
                            play = passingStats.find(item => item.id == player.remoteId);
                            if (play)
                                result = play.completions;
                            break;
                        case 'Pass TDs':
                            play = passingStats.find(item => item.id == player.remoteId);
                            if (play)
                                result = play.touchdowns;
                            break;
                        case 'INT':
                            play = passingStats.find(item => item.id == player.remoteId);
                            if (play)
                                result = play.interceptions;
                            break;
                        case 'Receiving Yards':
                            play = receivingStats.find(item => item.id == player.remoteId);
                            if (play)
                                result = play.yards;
                            break;
                        case 'Receptions':
                            play = receivingStats.find(item => item.id == player.remoteId);
                            if (play)
                                result = play.receptions;
                            break;
                        case 'FG Made':
                            play = fieldGoalStats.find(item => item.id == player.remoteId);
                            if (play)
                                result = play.made;
                            break;
                        case 'Tackles+Ast':
                            play = defenseStats.find(item => item.id == player.remoteId)
                            if (play)
                                result = play.tackles + play.assists;
                            break;
                    }
                    console.log("play " + play);
                    console.log("result " + result);
                    if (!play || result == undefined) {
                        refund += 1;
                    }
                    else {
                        pick.result = result;
                        bet.picks[bet.picks.indexOf(pick)] = pick;
                    }
                }
                if (pick.result != undefined) {
                    finished += 1;
                    if (pick.overUnder == "over" && pick.result > pick.prop.odds ||
                        pick.overUnder == "under" && pick.result < pick.prop.odds) {
                        win += 1;
                    } else {
                        lost += 1;
                    }
                }
            }
           
            if (finished + refund == bet.picks.length) {
                if (refund) {
                    if (bet.betType == "high" && lost > 0) {
                        console.log("lost");
                        bet.prize = 0;
                        bet.status = "lost";
                        
                    } else {
                        if(bet.betType == "low") {
                            switch(bet.picks.length) {
                                case 3:
                                case 4:
                                    if(lost > 0) {
                                        console.log("lost");
                                        bet.prize = 0;
                                        bet.status = "lost";                           
                                    } else  {
                                        console.log("refund");
                                        bet.status = "refund";                                    
                                    }
                                    break;
                                case 5:
                                case 6:
                                    if(lost > 1) {
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
                    if(bet.status == "refund"){
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
                        default:
                            break;
                    }
                    console.log("status + " + bet.status);
                    console.log("bet result " + bet);
                    await bet.save();
                    if (bet.status == "win")
                        await addPrizeTransaction(bet.userId, bet.prize, 'prize');
                    if (bet.status == 'win') {
                        const user = await User.findById(bet.userId);
                        if (user) {
                            user.wins += 1;
                        }
                        await user.save();
                        await updateBetResult(true);
                        await updateCapital(3, await USD2Ether(bet.prize - bet.entryFee));
                    } else {
                        await updateBetResult(false);
                        await updateCapital(2, await USD2Ether(bet.entryFee - bet.credit));
                    }                    
                }
            }            
        }
        event.state = 3;
        await event.save();
    } catch (error) {
        console.log(error);
    }
};
const summarizeNBAStatsByPlayer = (data) => {
    const homeStats = data.home.players;
    const awayStats = data.away.players;

    return [...homeStats, ...awayStats];

};
const updateNBABet = async (event) => {
    try {
        console.log(event);
        const summary = await fetchMLBGameSummary(event.matchId);
        if (!summary || summary.game.status != 'closed')
            return;
        const players = summarizeMLBStatsByPlayer(summary);
        
    } catch (error) {
        console.log(error);
    }
};

const updateCFBBet = async (event) => {
    try {
        console.log(event.matchId, true);
        const statistics = await fetchCFBGameSummary(event.matchId);
        console.log("summaryCFB" + event._id, true);
        console.log(statistics.status, true);
        if (statistics.status != "closed" && statistics.status != "complete")
            return;

        const rushingStats = summarizeStatsByPlayer(statistics, 'rushing');
        const receivingStats = summarizeStatsByPlayer(statistics, 'receiving');
        const passingStats = summarizeStatsByPlayer(statistics, 'passing');
        //const fieldGoalStats = summarizeStatsByPlayer(statistics, 'field_goals');
        //const defenseStats = summarizeStatsByPlayer(statistics, 'defense');

        console.log("bets " + event.participants, true);
        for (const betId of event.participants) {
            let bet = await Bet.findById(betId);
            //const pick = bet.picks.find(item => item.contestId == event._id);
            if (!bet || bet.status != 'pending')
                continue;
            console.log("id" + bet._id);
            let finished = 0, win = 0, refund = 0, lost = 0;
            for (const pick of bet.picks) {
                if (String(pick.contestId) == String(event._id)) {
                    let result, play;
                    const player = await Player.findById(pick.playerId);

                    console.log("player " + player);
                    // let index = player.odds.find(item=> String(item.event) == String(event._id));
                    // if(index == undefined || index == -1)
                    // {
                    //     refund = 1;
                    //     break;
                    // }
                    switch (pick.prop.propName) {
                        case 'Rush Yards':
                            play = rushingStats.find(item => item.id == player.remoteId);
                            if (play)
                                result = play.yards;
                            break;
                        case 'Pass Yards':
                            play = passingStats.find(item => item.id == player.remoteId);
                            if (play)
                                result = play.yards;
                            break;
                        case 'Pass TDs':
                            play = passingStats.find(item => item.id == player.remoteId);
                            if (play)
                                result = play.touchdowns;
                            break;
                        case 'Receiving Yards':
                            play = receivingStats.find(item => item.id == player.remoteId);
                            if (play)
                                result = play.yards;
                            break;
                    }
                    console.log("play " + play);
                    console.log("result " + result);
                    if (!play || result == undefined) {
                        refund = 1;
                    }
                    else {
                        pick.result = result;
                        bet.picks[bet.picks.indexOf(pick)] = pick;
                    }
                }
                if (pick.result != undefined) {
                    finished += 1;
                    if (pick.overUnder == "over" && pick.result > pick.prop.odds ||
                        pick.overUnder == "under" && pick.result < pick.prop.odds) {
                        win += 1;
                    } else {
                        lost += 1;
                    }
                }
            }
            if (refund) {
                if (bet.betType == "high" && lost > 0) {
                    console.log("lost");
                    bet.prize = 0;
                    bet.status = "lost";
                    await bet.save();
                    await updateBetResult(false);
                    await updateCapital(2, await USD2Ether(bet.entryFee - bet.credit));
                } else {
                    console.log('refund');
                    const user = await User.findById(bet.userId);
                    if (bet.credit > 0)
                        user.credits += bet.credit;
                    //let entryETH = await USD2Ether(bet.entryFee - bet.credit);
                    //user.ETH_balance += entryETH;
                    //await updateTotalBalanceAndCredits(entryETH, bet.credit);
                    bet.status = 'refund';
                    await bet.save();
                    await addPrizeTransaction(bet.userId, bet.entryFee - bet.credit, 'refund');
                    await user.save();
                }
                continue;
            }
            if (finished == bet.picks.length) {
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
                    default:
                        break;
                }
                console.log("status + ", bet.status);
                if (bet.status == "win")
                    await addPrizeTransaction(bet.userId, bet.prize, 'prize');
                if (bet.status == 'win') {
                    const user = await User.findById(bet.userId);
                    if (user) {
                        user.wins += 1;
                    }
                    await user.save();
                    await updateBetResult(true);
                    await updateCapital(3, await USD2Ether(bet.prize - bet.entryFee));
                } else {
                    await updateBetResult(false);
                    await updateCapital(2, await USD2Ether(bet.entryFee - bet.credit));
                }
            }
            console.log("bet result ", bet);
            await bet.save();
        }
        event.state = 3;
        await event.save();
    } catch (error) {
        console.log(error);
    }
};
const summarizeMLBStatsByPlayer = (data, category) => {
    const homeStats = data.game.home.players;
    const awayStats = data.game.away.players;


    return [...homeStats, ...awayStats];

};

const test = async (req, res) => {
    const player = await Player.findById(new ObjectId("65174eba8348bc70ea29d814"));
    console.log(player);
    let index = player.odds.find(item => String(item.event) == String(new ObjectId("651cad6d59935df26a9c2024")));
    console.log(index);
    if (index == undefined)
        console.log("asdf");
    res.json(index);
}
const updateMLBBet = async (event) => {
    try {
        console.log(event);
        const summary = await fetchMLBGameSummary(event.matchId);
        if (!summary || summary.game.status != 'closed')
            return;
        const players = summarizeMLBStatsByPlayer(summary);
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
                    play = players.find(item => item.id == player.remoteId);
                    if (!play) {
                        refund = 1;
                    }
                    // let index = player.odds.find(item => String(item.event) == String(event._id));
                    // if(index == undefined || index == -1)
                    // {
                    //     refund = 1;
                    //     break;
                    // }
                    console.log(pick.prop.propName);
                    console.log(JSON.stringify(play.statistics.hitting));
                    console.log(JSON.stringify(play.statistics.pitching));
                    switch (pick.prop.propName) {
                        case 'Pitcher Strikeouts':
                            if (play.statistics.hitting)
                                result = play.statistics.hitting.overall.outs.ktotal != undefined ?
                                    play.statistics.hitting.overall.outs.ktotal : -1;
                            else if (play.statistics.pitching)
                                result = play.statistics.pitching.overall.outs.ktotal != undefined ?
                                    play.statistics.pitching.overall.outs.ktotal : -1;
                            break;
                        case 'Total Bases':
                            console.log(play.statistics.hitting);
                            if (play.statistics.hitting)
                                result = play.statistics.hitting.overall.onbase.tb != undefined ?
                                    play.statistics.hitting.overall.onbase.tb : -1;
                            else if (play.statistics.pitching)
                                result = play.statistics.pitching.overall.onbase.tb != undefined ?
                                    play.statistics.pitching.overall.onbase.tb : -1;
                            break;
                        case 'Earned Runs':
                            if (play.statistics.hitting)
                                result = play.statistics.hitting.overall.runs.earned != undefined ?
                                    play.statistics.hitting.overall.runs.earned : -1;
                            else if (play.statistics.pitching)
                                result = play.statistics.pitching.overall.runs.earned != undefined ?
                                    play.statistics.pitching.overall.runs.earned : -1;
                            break;
                        case 'Total Hits':
                            if (play.statistics.hitting)
                                result = play.statistics.hitting.overall.onbase.h != undefined ?
                                    play.statistics.hitting.overall.onbase.h : -1;
                            else if (play.statistics.pitching)
                                result = play.statistics.pitching.overall.onbase.h != undefined ?
                                    play.statistics.pitching.overall.onbase.h : -1;
                            break;
                        case 'Total Runs':
                            console.log(JSON.stringify(play.statistics));
                            if (play.statistics.hitting) {
                                console.log(play.statistics.hitting.overall.runs.total);
                                result = play.statistics.hitting.overall.runs.total != undefined ?
                                    play.statistics.hitting.overall.runs.total : -1;
                            }

                            else if (play.statistics.pitching)
                                result = play.statistics.pitching.overall.runs.total != undefined ?
                                    play.statistics.pitching.overall.runs.total : -1;
                            console.log(result);
                            break;
                        case 'Hits Allowed':
                            if (play.statistics.hitting)
                                result = play.statistics.hitting.overall.onbase.h != undefined ?
                                    play.statistics.hitting.overall.onbase.h : -1;
                            else if (play.statistics.pitching)
                                result = play.statistics.pitching.overall.onbase.h != undefined ?
                                    play.statistics.pitching.overall.onbase.h : -1;
                            break;
                        case 'Pitching Outs':
                            if (play.statistics.hitting)
                                result = play.statistics.hitting.overall.ip_1 != undefined ?
                                    play.statistics.hitting.overall.ip_1 : -1;
                            else if (play.statistics.pitching)
                                result = play.statistics.pitching.overall.ip_1 != undefined ?
                                    play.statistics.pitching.overall.ip_1 : -1;
                            break;
                    }

                    console.log(result);
                    if (result !== undefined && result != -1) {
                        pick.result = result;
                        bet.picks[bet.picks.indexOf(pick)] = pick;
                    } else {
                        refund = 1;
                    }
                }
                if (pick.result != undefined) {
                    finished += 1;
                    if (pick.overUnder == "over" && pick.result > pick.prop.odds ||
                        pick.overUnder == "under" && pick.result < pick.prop.odds) {
                        win += 1;
                    } else {
                        lost += 1;
                    }
                }
            }
            console.log("1146:  " + finished);
            if (refund) {
                if (bet.betType == "high" && lost > 0) {
                    console.log("lost");
                    bet.prize = 0;
                    bet.status = "lost";
                    await bet.save();
                    await updateBetResult(false);
                    await updateCapital(2, await USD2Ether(bet.entryFee - bet.credit));
                } else {
                    console.log("Refund");
                    const user = await User.findById(bet.userId);
                    if (bet.credit > 0)
                        user.credits += bet.credit;
                    //let entryETH = await USD2Ether(bet.entryFee - bet.credit);
                    //user.ETH_balance += entryETH;
                    //await updateTotalBalanceAndCredits(entryETH, bet.credit);
                    bet.status = 'refund';
                    await bet.save();
                    await addPrizeTransaction(bet.userId, bet.entryFee - bet.credit, 'refund');
                    await user.save();
                    continue;
                }
            }
            if (finished == bet.picks.length) {
                console.log("finished : " + finished);
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
                                bet.prize = bet.entryFee * BET_5_5_LOW;
                                bet.status = "win"
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
                    default:
                        break;
                }
                if (bet.status == "win") {
                    await addPrizeTransaction(bet.userId, bet.prize, 'prize');
                }
                if (bet.status == 'win') {
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
            await bet.save();
            console.log("Bet udpated : " + JSON.stringify(bet));
        }
        event.state = 3;
        await event.save();
        console.log("Update Bets from MLB Event finished at " + new Date().toString() + " Id: " + event._id);
    } catch (error) {
        console.log(error);
    }
}
const summarizeNHLPlayers = (data) => {
    const homeStats = data.home.players;
    const awayStats = data.away.players;


    return [...homeStats, ...awayStats];
};
const updateNHLBet = async (event) => {
    try {
        console.log(event);
        const summary = await fetchNHLGameSummary(event.matchId);
        if (!summary || summary.status != 'closed')
            return;
        const players = summarizeNHLPlayers(summary);
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
                    play = players.find(item => item.id == player.remoteId);
                    if (!play) {
                        refund = 1;
                    }
                    // let index = player.odds.find(item => String(item.event) == String(event._id));
                    // if(index == undefined || index == -1)
                    // {
                    //     refund = 1;
                    //     break;
                    // }
                    console.log(pick.prop.propName);

                    switch (pick.prop.propName) {
                        case 'Total Shots':
                            result = play.statistics.total.shots != undefined ?
                                play.statistics.total.shots : -1;
                            break;
                        case 'Total Assists':
                            result = play.statistics.total.assists != undefined ?
                                play.statistics.total.assists : -1;
                            break;
                        case 'Total Points':
                            result = play.statistics.total.points != undefined ?
                                play.statistics.total.points : -1;
                            break;
                        case 'Total Power Play Points':
                            result = play.statistics.powerplay != undefined ?
                                play.statistics.powerplay.goals + play.statistics.powerplay.assists : -1;
                            break;
                    }

                    console.log(result);
                    if (result !== undefined && result != -1) {
                        pick.result = result;
                        bet.picks[bet.picks.indexOf(pick)] = pick;
                    } else {
                        refund = 1;
                    }
                }
                if (pick.result != undefined) {
                    finished += 1;
                    if (pick.overUnder == "over" && pick.result > pick.prop.odds ||
                        pick.overUnder == "under" && pick.result < pick.prop.odds) {
                        win += 1;
                    } else {
                        lost += 1;
                    }
                }
            }
            console.log("1146:  " + finished);
            if (refund) {
                if (bet.betType == "high" && lost > 0) {
                    console.log("lost");
                    bet.prize = 0;
                    bet.status = "lost";
                    await bet.save();
                    await updateBetResult(false);
                    await updateCapital(2, await USD2Ether(bet.entryFee - bet.credit));
                } else {
                    console.log("Refund");
                    const user = await User.findById(bet.userId);
                    if (bet.credit > 0)
                        user.credits += bet.credit;
                    //let entryETH = await USD2Ether(bet.entryFee - bet.credit);
                    //user.ETH_balance += entryETH;
                    //await updateTotalBalanceAndCredits(entryETH, bet.credit);
                    bet.status = 'refund';
                    await bet.save();
                    await addPrizeTransaction(bet.userId, bet.entryFee - bet.credit, 'refund');
                    await user.save();
                    continue;
                }
            }
            if (finished == bet.picks.length) {
                console.log("finished : " + finished);
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
                                bet.prize = bet.entryFee * BET_5_5_LOW;
                                bet.status = "win"
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
                    default:
                        break;
                }
                if (bet.status == "win") {
                    await addPrizeTransaction(bet.userId, bet.prize, 'prize');
                }
                if (bet.status == 'win') {
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
            await bet.save();
            console.log("Bet udpated : " + JSON.stringify(bet));
        }
        event.state = 3;
        await event.save();
        console.log("Update Bets from NHL Event finished at " + new Date().toString() + " Id: " + event._id);
    } catch (error) {
        console.log(error);
    }
}
const getSoccerPlayers = (data) => {

    let homePlayers = data.totals.competitors[0].players;
    let awayPlayers = data.totals.competitors[1].players;
    return [...homePlayers, ...awayPlayers];
}
const updateSoccerBet = async (event) => {
    try {
        let data = await fetchSoccerEventSummary(event.id);
        console.log("update Soccer " + event.participants);
        console.log(JSON.stringify(data), true);
        if (!data.hasOwnProperty('statistics'))
            return;
        if (data.sport_event_status.match_status !== "ended")
            return;
        let statistics = data.statistics;
        //console.log(statistics);
        let players = getSoccerPlayers(statistics);
        //console.log(JSON.stringify(players));
        for (const betId of event.participants) {
            console.log(betId);
            let bet = await Bet.findById(betId);
            if (!bet || bet.status != 'pending')
                continue;
            console.log(bet.entryFee);
            let finished = 0, win = 0, refund = 0, lost = 0;
            for (const pick of bet.picks) {
                if (String(pick.contestId) == String(event._id)) {
                    let result, play;
                    console.log("1292");
                    const player = await Player.findById(pick.playerId);
                    if (!player)
                        continue;
                    play = players.find(item => item.id == player.srId);

                    if (play) {
                        result = play.statistics.goals_scored;
                        console.log(result);
                        pick.result = result;
                        bet.picks[bet.picks.indexOf(pick)] = pick;
                    }
                    else {
                        refund = 1;
                    }
                }

                if (pick.result != undefined) {
                    console.log(pick.result);
                    finished += 1;
                    if (pick.overUnder == "over" && pick.result > pick.prop.odds ||
                        pick.overUnder == "under" && pick.result < pick.prop.odds) {
                        win += 1;
                    } else {
                        lost += 1;
                    }
                }
            }
            console.log("win: " + win + " lost: " + lost);
            if (refund) {
                const user = await User.findById(bet.userId);
                if (!user)
                    continue;
                if (bet.betType == "high" && lost > 0) {
                    console.log("lost");
                    bet.prize = 0;
                    bet.status = "lost";
                    await bet.save();
                    await updateBetResult(false);
                    await updateCapital(2, await USD2Ether(bet.entryFee - bet.credit));
                } else {
                    if (bet.credit > 0)
                        user.credits += bet.credit;
                    //let entryETH = await USD2Ether(bet.entryFee - bet.credit);
                    //user.ETH_balance += entryETH;
                    //await updateTotalBalanceAndCredits(entryETH, bet.credit);
                    bet.status = 'refund';
                    await bet.save();
                    await addPrizeTransaction(bet.userId, bet.entryFee - bet.credit, 'refund');
                    await user.save();
                }
                continue;
            }
            console.log(finished);
            if (finished == bet.picks.length) {
                console.log("1351");
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
                    default:
                        break;
                }
                if (bet.status == "win")
                    await addPrizeTransaction(bet.userId, bet.prize, 'prize');

                if (bet.status == 'win') {
                    const user = await User.findById(bet.userId);
                    if (user) {
                        user.wins += 1;

                    }
                    await user.save();
                    await updateBetResult(true);
                    await updateCapital(3, await USD2Ether(bet.prize - bet.entryFee));
                } else {
                    await updateBetResult(false);
                    await updateCapital(2, await USD2Ether(bet.entryFee - bet.credit));
                }
            }
            console.log("1468")
            await bet.save();
        }
        event.state = 3;
        await event.save();
    } catch (error) {
        console.log(error);
    }
};

const updateBet = async (eventId) => {
    try {
        const event = await Event.findOne({
            _id: eventId
        });
        console.log(event);
        if (!event)
            return;

        if (String(event.sportId) == '650e0b6fb80ab879d1c142c8') {
            updateNFLBet(event);
        }
        else if (String(event.sportId) == String('65108fcf4fa2698548371fc0')) {
            updateMLBBet(event);
        }
        else if (String(event.sportId) == '65131974db50d0c2c8bf7aa7') {
            updateSoccerBet(event);
        } else if (String(event.sportId) == '65108faf4fa2698548371fbd') {
            updateNHLBet(event);
        } else if (String(event.sportId) == '652f31fdfb0c776ae3db47e1') {
            updateCFBBet(event);
        }
    } catch (error) {
        console.log(error);
    }
};

const testBet = async (req, res) => {
    try {
        const { eventId } = req.body;
        const event = await Event.findById(new ObjectId(eventId));
        console.log(event);
        await updateBet(event._id);

    } catch (error) {
        console.log(error);
    }
}
const getWeekEventAll = async () => {
    try {
        await getWeeklyEventsNFL();
        await getWeeklyEventsMLB();
        await getWeeklyEventsSoccer();
        await getWeeklyEventsNHL();
        await getWeeklyEventsCFB();
        await getWeeklyEventsNBA();
        // Promise.all([
        //     getWeeklyEventsNFL(),
        //     getWeeklyEventsMLB(),
        //     getWeeklyEventsSoccer(),
        //     getWeeklyEventsNHL(),
        //     getWeeklyEventsCFB()
        // ]);
    } catch (error) {
        console.log(error);
    }
}
const checkEvents = async () => {
    try {
        let events = await Event.find({ state: 2 });
        console.log("checkEvents");
        for (let event of events) {
            if (String(event.sportId) == '650e0b6fb80ab879d1c142c8') {
                console.log("NFL " + event._id);
                await updateNFLBet(event);
            }
            else if (String(event.sportId) == String('65108fcf4fa2698548371fc0')) {
                console.log("MLB " + event._id);
                await updateMLBBet(event);
            }
            else if (String(event.sportId) == '65131974db50d0c2c8bf7aa7') {
                console.log("Soccer " + event._id);
                await updateSoccerBet(event);
            }
            else if (String(event.sportId) == '65108faf4fa2698548371fbd') {
                console.log("NHL " + event._id);
                await updateNHLBet(event);
            } else if ((String(event.sportId) == '652f31fdfb0c776ae3db47e1')) {
                console.log("CFB " + event._id);
                await updateCFBBet(event);
            }
        }
    } catch (error) {
        console.log(error);
    }
}

const changeEventState = async (req, res) => {
    await Event.updateMany({ state: 1 }, { $set: { state: 0 } });
    return res.json({ status: "success" });
}
module.exports = {
    getWeeklyEventsNFL,
    getWeeklyEventsMLB,
    getLiveDataByEvent,
    getWeeklyEventsSoccer,
    getWeekEventAll,
    remove,
    testBet,
    checkEvents,
    changeEventState,
    test,
    getWeeklyEventsNHL,
    getWeeklyEventsCFB,
    testlive,
    getWeeklyEventsNBA
}