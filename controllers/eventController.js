const Event = require('../models/Event');
const Player = require('../models/Player');
const Prop = require('../models/Prop');
const User = require('../models/User');
const Team = require('../models/Team');
const Bet = require('../models/Bet');
const { updateCapital } = require('./capitalController');
const {updateBetResult} = require('./statisticsController');
require('../utils/log');
const request = require('request')
const {
    NFL_LIVEDATA_BASEURL,
    MLB_LIVEDATA_BASEURL,
    NHL_LIVEDATA_BASEURL
} = require('../config/constant');
const {
    ObjectId
} = require("mongodb");
const {
    fetchWeeklyEventsNFL,
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
    fetchSoccerEventSummary
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

            const mapping = mappings.find(item => item.id === event.sport_event.id);
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
            //await myEvent.save();
            for (const playerProp of playerProps) {
                //console.log(playerProp.player.id);
                const player = await Player.findOne({
                    srId: playerProp.player.id
                });
                if (!player)
                    continue;
                for (const market of playerProp.markets) {
                    const prop = await Prop.findOne({
                        srId: market.id
                    });
                    if (!player || !prop) continue;
                    const index = player.odds.findIndex(odd => String(odd.id) === String(prop._id));
                    //console.log(market);
                    if (index !== -1) {
                        player.odds[index].value = market.books[0].outcomes[0].open_total;
                        player.odds[index].event = myEvent._id;
                    } else {
                        player.odds.push({
                            id: prop._id,
                            value: market.books[0].outcomes[0].open_total,
                            event: myEvent._id
                        });
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

const getWeeklyEventsMLB = async () => {
    try {
        const mappings = await fetchEventMapping();
        if (!mappings || !Array.isArray(mappings)) {
            console.log('No mappings');
            return;
        }
        //console.log(mappings);        
        let players = await fetchPlayerMapping(0);
        players.concat(await fetchPlayerMapping(1000));
        players.concat(await fetchPlayerMapping(2000));
        if (!players || !Array.isArray(players)) {
            console.log('No player mapping');
            return;
        }

        let events = await fetchWeeklyEventsMLB();
        let now = new Date();
        events = events.filter(item => new Date(item.sport_event.start_time) > now);
        console.log("MLB events count = " + events.length);
        for (const event of events) {

            const myEvent = new Event({
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

            const mapping = mappings.find(item => item.id === event.sport_event.id);
            if (mapping)
                myEvent.matchId = mapping.external_id;


            const playerProps = await fetchEventPlayerProps(event.sport_event.id);
            const existingEvent = await Event.findOne({ sportId: new ObjectId('65108fcf4fa2698548371fc0'), id: event.sport_event.id });
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
                console.log(playerProp.player.id);
                console.log(playerProp.player.name);
                const play = players.find(item => String(item.id) === String(playerProp.player.id));
                if (!play)
                    continue;
                const player = await Player.findOne({
                    remoteId: play.external_id
                });
                if (!player)
                    continue;
                console.log(player);
                for (const market of playerProp.markets) {
                    const prop = await Prop.findOne({
                        srId: market.id
                    });
                    if (!prop) continue;
                    const index = player.odds.findIndex((odd) => String(odd.id) === String(prop._id));
                    console.log(market);
                    if (index !== -1) {
                        player.odds[index].value = market.books[0].outcomes[0].open_total;
                        player.odds[index].event = myEvent._id;
                    } else {
                        player.odds.push({
                            id: prop._id,
                            value: market.books[0].outcomes[0].open_total,
                            event: myEvent._id
                        });
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
    "sr:competitor:2702"
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
    "Ronaldo, Cristiano"
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
]
const processSoccerEvents = async (mappings, events) => {
    try {

        console.log("MLB events count = " + events.length);
        let now = new Date();
        let eventes = events.filter(item => new Date(item.sport_event.start_time) > now);
        console.log("MLB events count = " + eventes.length);
        for (const event of eventes) {
            let competitors = event.sport_event.competitors;

            let myEvent = new Event({
                id: event.sport_event.id,
                startTime: event.sport_event.start_time,
                sportId: new ObjectId('65131974db50d0c2c8bf7aa7'),
                competitors: competitors
            });
            let index = competitiorDraft.indexOf(competitors[0].id);
            if (index === -1)
                index = competitiorDraft.indexOf(competitors[1].id);
            if (index === -1)
                continue;

            myEvent.name = competitors[0].abbreviation + " vs " + competitors[1].abbreviation;

            const mapping = mappings.find(item => item.id === event.sport_event.id);
            if (mapping)
                myEvent.matchId = mapping.external_id;

            const markets = await fetchSoccerPlayerProps(event.sport_event.id);
            //console.log(markets);
            //const market = markets.find(item => item.name ==="anytime goalscorer");
            if (!markets)
                continue;
            const existingEvent = await Event.findOne({ sportId: new ObjectId('65131974db50d0c2c8bf7aa7'), id: event.sport_event.id });
            if (existingEvent) {
                // Event already exists, update it
                myEvent = existingEvent;
                existingEvent.startTime = myEvent.startTime;
                await existingEvent.save();               
            } else {
                // Event doesn't exist, insert new event
                await myEvent.save();
                console.log('Soccer New event inserted! id = ' + myEvent.id);
            }
            for (const play of markets[0].books[0].outcomes) {
                let player = await Player.findOne({ srId: play.player_id });
                if (!player) {

                    const profile = await fetchSoccerPlayerProfile(play.player_id);
                    let name = profile.player.name;
                    if (nameDraft.indexOf(name) !== -1) {
                        let com = profile.competitors[0].id;
                        let i = competitiorDraft.indexOf(com);
                        if (i === -1)
                            i = competitiorDraft.indexOf(profile.competitors[1].id)

                        console.log("asdf" + profile.player.name);
                        player = new Player({
                            sportId: new ObjectId('65131974db50d0c2c8bf7aa7'),
                            name: profile.player.name,
                            jerseyNumber: profile.player.jersey_number,
                            position: profile.player.type,
                            srId: play.player_id,
                            teamName: profile.competitors[0].abbreviation,
                            teamId: new ObjectId(teamDraft[i])
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
        console.log(events.length);
        for (const event of events) {
            url = ""
            let sportType = ""
            if (new Date().getTime() - event.startTime > 1000 * 60 * 60 * 3) {
                await Event.updateOne({
                    _id: event._id
                }, {
                    $set: {
                        state: 3
                    }
                })
                continue;
            }

            if (event.sportId == '650e0b6fb80ab879d1c142c8') {
                url = `${NFL_LIVEDATA_BASEURL}=${NFL_API_KEY}&match=sd:match:${event.matchId}`
                sportType = "NFL"
            }
            // if (event.sportId == '65108faf4fa2698548371fbd') {
            //     url = `${NHL_LIVEDATA_BASEURL}=${NHL_API_KEY}&match=sd:match:${event.matchId}`
            //     sportType = "NHL"
            // }
            else if (event.sportId == '65108fcf4fa2698548371fc0') {
                url = `${MLB_LIVEDATA_BASEURL}=${MLB_API_KEY}&match=sd:match:${event.matchId}`
                sportType = "MLB"
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
            await Event.updateOne({
                _id: event._id
            }, {
                $set: {
                    state: 1
                }
            })
            let broadcastingData = {
                contestId: event._id
            }
            const stream = request(url);
            let isCompleted = false;
            let failCount = 0;
            stream.on('data', async (chunk) => {
                // Process the incoming data chunk here
                if (isJSON(chunk.toString())) {
                    const jsonData = JSON.parse(chunk.toString());
                    if (jsonData.hasOwnProperty('payload')) {
                        failCount = 0;
                        const detailData = jsonData['payload'];
                        if (detailData.hasOwnProperty('player')) {
                            if (sportType == "NFL") {
                                broadcastingData.player = getNFLData(detailData);
                                console.log(broadcastingData)
                                global.io.sockets.emit('broadcast', { broadcastingData });
                            }
                            // if (sportType == "NHL") {
                            //     broadcastingData.player = getNHLData(detailData);
                            // }
                            if (sportType == "MLB") {
                                if (detailData.hasOwnProperty('statistics')) {
                                    broadcastingData.player = getMLBData(detailData);
                                    console.log(broadcastingData)
                                    global.io.sockets.emit('broadcast', { broadcastingData });
                                }
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
                        updateBet(event._id);
                        stream.abort();
                    }
                    if (!isCompleted && jsonData.hasOwnProperty('heartbeat')) {
                        failCount++;
                        if (failCount > 100) {
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
                stream.abort();
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
                stream.abort();
            });


        }
    } catch (error) {
        //throw new Error(error.message);
        console.log(error);
    }
}

const getNFLData = (detailData) => {
    const player = {
        id: detailData.player.id,
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

// const getNHLData = (detailData) => {
//     const player = { id: detailData.player.id, name: detailData.player.name }
//     if (detailData.hasOwnProperty('rushing')) {
//         player['Rush Yards'] = detailData.rushing.yards;
//     }
//     if (detailData.hasOwnProperty('passing')) {
//         player['Pass Yards'] = detailData.passing.yards;
//         player['Pass Attempts'] = detailData.passing.attempts;
//         player['Pass Completions'] = detailData.passing.completions;
//         player['Pass TDs'] = detailData.passing.touchdowns;
//         player['INT'] = detailData.passing.interceptions;
//     }
//     if (detailData.hasOwnProperty('receiving')) {
//         player['Receving Yards'] = detailData.receiving.yards;
//         player['Receptions'] = detailData.receiving.receptions;
//     }
//     if (detailData.hasOwnProperty('field-goals')) {
//         player['FG Made'] = detailData.field_goals.made;
//     }
//     if (detailData.hasOwnProperty('defense')) {
//         player['Tackles+Ast'] = detailData.defense.tackles + detailData.defense.assists;
//     }
//     return player;
// }

const getMLBData = (detailData) => {
    const player = {
        id: detailData.player.id,
        name: detailData.player.first_name + " " + detailData.player.last_name
    }
    if (detailData.statistics.hasOwnProperty('hitting')) {
        player['Pitcher Strikeouts'] = detailData.statistics.hitting.overall.outs.ktotal ?
            detailData.statistics.hitting.overall.outs.ktotal : 0;
        player['Total Bases'] = detailData.statistics.hitting.overall.onbase.tb ?
            detailData.statistics.hitting.overall.onbase.tb : 0;
        player['Earned Runs'] = detailData.statistics.hitting.overall.runs.earned ?
            detailData.statistics.hitting.overall.runs.earned : 0;
        player['Total Runs'] = detailData.statistics.hitting.overall.runs.total ?
            detailData.statistics.hitting.overall.runs.total : 0;
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
    }

    return player;
};

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
        console.log(event.matchId);
        const statistics = await fetchNFLGameSummary(event.matchId);
        console.log("summaryNFL", event._id);
        console.log(statistics.status);
        if (statistics.status != "closed" && statistics.status != "complete")
            return;
        console.log("asdfasdf");
        const rushingStats = summarizeStatsByPlayer(statistics, 'rushing');
        const receivingStats = summarizeStatsByPlayer(statistics, 'receiving');
        const passingStats = summarizeStatsByPlayer(statistics, 'passing');
        const fieldGoalStats = summarizeStatsByPlayer(statistics, 'field_goals');
        const defenseStats = summarizeStatsByPlayer(statistics, 'defense');      
        
        console.log("bets "+ event.participants);
        for (const betId of event.participants) {
            let bet = await Bet.findById(betId);
            //const pick = bet.picks.find(item => item.contestId === event._id);
            if (!bet || bet.status != 'pending')
                continue;
            console.log("id" + bet._id);
            let finished = 0, win = 0, refund = 0;
            for (const pick of bet.picks) {
                if (String(pick.contestId) === String(event._id)) {
                    let result, play;
                    const player = await Player.findById(pick.playerId);
                    console.log("player", player );
                    switch (pick.prop.propName) {
                        case 'Rush Yards':
                            play = rushingStats.find(item => item.id === player.remoteId);
                            if (play)
                                result = play.yards;

                            break;
                        case 'Pass Yards':
                            play = passingStats.find(item => item.id === player.remoteId);
                            if (play)
                                result = play.yards;
                            break;
                        case 'Pass Attempts':
                            play = passingStats.find(item => item.id === player.remoteId);
                            if (play)
                                result = play.attempts;
                            break;
                        case 'Pass Completions':
                            play = passingStats.find(item => item.id === player.remoteId);
                            if (play)
                                result = play.completions;
                            break;
                        case 'Pass TDs':
                            play = passingStats.find(item => item.id === player.remoteId);
                            if (play)
                                result = play.touchdown;
                            break;
                        case 'INT':
                            play = passingStats.find(item => item.id === player.remoteId);
                            if (play)
                                result = play.interceptions;
                            break;
                        case 'Receiving Yards':
                            play = receivingStats.find(item => item.id === player.remoteId);
                            if (play)
                                result = play.yards;
                            break;
                        case 'Receptions':
                            play = receivingStats.find(item => item.id === player.remoteId);
                            if (play)
                                result = play.receptions;
                            break;
                        case 'FG Made':
                            play = fieldGoalStats.find(item => item.id === player.remoteId);
                            if (play)
                                result = play.made;
                            break;
                        case 'Tackles+Ast':
                            play = defenseStats.find(item => item.id === player.remoteId)
                            if (play)
                                result = play.tackles + play.assists;
                            break;
                    }
                    console.log("play " + play);
                    console.log("result " + result);
                    if (!play)
                        refund = 1;
                    else {
                        pick.result = result;
                        bet.picks[bet.picks.indexOf(pick)] = pick;
                    }
                }
                if (pick.result) {
                    finished += 1;
                    if (pick.overUnder == "over" && pick.result > pick.prop.odds ||
                        pick.overUnder == "under" && pick.result < pick.prop.odds) {
                        win += 1;
                    }
                }
            }
            if (refund) {
                console.log('refund');
                const user = await User.findById(bet.userId);
                if (bet.credit > 0)
                    user.credits += bet.credit;
                let entryETH = await USD2Ether(bet.entryFee - bet.credit);
                user.ETH_balance += entryETH;
                await user.save();
                bet.status = 'refund';
                await bet.save();
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
                                if (bet.betType.equals("high")) {
                                    bet.prize = 0;
                                    bet.status = "lost"
                                } else {
                                    bet.prize = bet.entryFee * BET_2_3_LOW;
                                    bet.status = "win"
                                }
                                break;
                            case 3:
                                if (bet.betType.equals("high"))
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
                                if (bet.betType.equals("high")) {
                                    bet.prize = 0;
                                    bet.status = "lost"
                                } else {
                                    bet.prize = bet.entryFee * BET_3_4_LOW;
                                    bet.status = "win"
                                }
                                break;
                            case 4:
                                if (bet.betType.equals("high"))
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
                                if (bet.betType.equals("high")) {
                                    bet.prize = 0;
                                    bet.status = "lost"
                                } else {
                                    bet.prize = bet.entryFee * BET_3_5_LOW;
                                    bet.status = "win"
                                }
                                break;
                            case 4:
                                if (bet.betType.equals("high")) {
                                    bet.prize = 0;
                                    bet.status = "lost"
                                } else {
                                    bet.prize = bet.entryFee * BET_4_5_LOW;
                                    bet.status = "win"
                                }
                                break;
                            case 5:
                                if (bet.betType.equals("high")) {
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
                                if (bet.betType.equals("high")) {
                                    bet.prize = 0;
                                    bet.status = "lost"
                                } else {
                                    bet.prize = bet.entryFee * BET_4_6_LOW;
                                    bet.status = "win"
                                }
                                break;
                            case 5:
                                if (bet.betType.equals("high")) {
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
                if (bet.status === "win")
                    await addPrizeTransaction(bet.userId, bet.prize);
                if (bet.status === 'win') {
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
const updateMLBBet = async (event) => {
    try {
        const summary = await fetchMLBGameSummary(event.matchId);
        if (!summary || summary.game.status != 'closed')
            return;
        const players = summarizeMLBStatsByPlayer(summary);
        for (const bet of event.participants) {
            //const pick = bet.picks.find(item => item.contestId === event._id);
            if (!bet || bet.status != 'pending')
                continue;
            let finished = 0, win = 0, refund = 0;
            for (const pick of bet.picks) {
                if (String(pick.contestId) === String(event._id)) {
                    let result, play;
                    const player = await Player.findById(pick.playerId);
                    play = players.find(item => item.id === player.remoteId);
                    if (!play)
                        continue;
                    console.log(pick.prop.propName);
                    console.log(play.statistics.hitting);
                    switch (pick.prop.propName) {
                        case 'Pitcher Strikeouts':
                            if (play.statistics.hitting)
                                result = play.statistics.hitting.overall.outs.ktotal ?
                                    play.statistics.hitting.overall.outs.ktotal : 0;
                            else if (play.statistics.pitching)
                                result = play.statistics.pitching.overall.outs.ktotal ?
                                    play.statistics.pitching.overall.outs.ktotal : 0;
                            break;
                        case 'Total Bases':
                            console.log(play.statistics.hitting);
                            if (play.statistics.hitting)
                                result = play.statistics.hitting.overall.onbase.tb ?
                                    play.statistics.hitting.overall.onbase.tb : 0;
                            else if (play.statistics.pitching)
                                result = play.statistics.pitching.overall.onbase.tb ?
                                    play.statistics.pitching.overall.onbase.tb : 0;
                            break;
                        case 'Earned Runs':
                            if (play.statistics.hitting)
                                result = play.statistics.hitting.overall.runs.earned ?
                                    play.statistics.hitting.overall.runs.earned : 0;
                            else if (play.statistics.pitching)
                                result = play.statistics.pitching.overall.runs.earned ?
                                    play.statistics.pitching.overall.runs.earned : 0;
                            break;
                        case 'Total Hits':
                            if (play.statistics.hitting)
                                result = play.statistics.hitting.overall.onbase.h ?
                                    play.statistics.hitting.overall.onbase.h : 0;
                            else if (play.statistics.pitching)
                                result = play.statistics.pitching.overall.onbase.h ?
                                    play.statistics.pitching.overall.onbase.h : 0;
                            break;

                        case 'Total Runs':
                            //play = passingStats.find(item=> item.id === player.remoteId);
                            if (play.statistics.hitting)
                                result = play.statistics.hitting.overall.runs.total ?
                                    play.statistics.hitting.overall.runs.total : 0;
                            else if (play.statistics.pitching)
                                result = play.statistics.pitching.overall.runs.total ?
                                    play.statistics.pitching.overall.runs.total : 0;
                            break;
                    }
                    if (!play)
                        refund = 1;
                    else {
                        pick.result = result;
                        bet.picks[bet.picks.indexOf(pick)] = pick;
                    }
                }
                if (pick.result) {
                    finished += 1;
                    if (pick.overUnder === "over" && pick.result > pick.prop.odds ||
                        pick.overUnder === "under" && pick.result < pick.prop.odds) {
                        win += 1;
                    }
                }
            }
            if (refund) {
                const user = await User.findById(bet.userId);
                if (bet.credit > 0)
                    user.credits += bet.credit;
                let entryETH = await USD2Ether(bet.entryFee - bet.credit);
                user.ETH_balance += entryETH;
                await user.save();
                bet.status = 'refund';
                await bet.save();
                continue;
            }
            if (finished === bet.picks.length) {
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
                                if (bet.betType.equals("high")) {
                                    bet.prize = 0;
                                    bet.status = "lost"
                                } else {
                                    bet.prize = bet.entryFee * BET_2_3_LOW;
                                    bet.status = "win"
                                }
                                break;
                            case 3:
                                if (bet.betType.equals("high"))
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
                                if (bet.betType.equals("high")) {
                                    bet.prize = 0;
                                    bet.status = "lost"
                                } else {
                                    bet.prize = bet.entryFee * BET_3_4_LOW;
                                    bet.status = "win"
                                }
                                break;
                            case 4:
                                if (bet.betType.equals("high"))
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
                                if (bet.betType.equals("high")) {
                                    bet.prize = 0;
                                    bet.status = "lost"
                                } else {
                                    bet.prize = bet.entryFee * BET_3_5_LOW;
                                    bet.status = "win"
                                }
                                break;
                            case 4:
                                if (bet.betType.equals("high")) {
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
                                if (bet.betType.equals("high")) {
                                    bet.prize = 0;
                                    bet.status = "lost"
                                } else {
                                    bet.prize = bet.entryFee * BET_4_6_LOW;
                                    bet.status = "win"
                                }
                                break;
                            case 5:
                                if (bet.betType.equals("high")) {
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
                if (bet.status === "win") {
                    await addPrizeTransaction(bet.userId, bet.prize);
                }
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
                await bet.save();
            }
        }
        event.state = 3;
        await event.save();
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
        console.log("update Soccer ");
        //console.log(data);
        if (!data.hasOwnProperty('statistics'))
            return;
        let statistics = data.statistics;
        console.log(statistics);  
        let players = getSoccerPlayers(statistics);
        for (const bet of event.participants) {
            if (bet.status != 'pending')
                continue;
            let finished = 0, win = 0, refund = 0;
            for (const pick of bet.picks) {
                if (String(pick.contestId) === String(event._id)) {
                    let result, play;
                    const player = await Player.findById(pick.playerId);
                    play = players.find(item => item.id === player.srId && item.starter === true);
                    if (play) {
                        result = player.statistics.goals_scored;
                        pick.result = result;
                        bet.picks[bet.picks.indexOf(pick)] = pick;
                    } else
                        refund = 1;
                }
                if (pick.result) {
                    finished += 1;
                    if (pick.overUnder == "over" && pick.result > pick.prop.odds ||
                        pick.overUnder == "under" && pick.result < pick.prop.odds) {
                        win += 1;
                    }
                }
            }
            if (refund) {
                const user = await User.findById(bet.userId);
                if (bet.credit > 0)
                    user.credits += bet.credit;
                let entryETH = await USD2Ether(bet.entryFee - bet.credit);
                user.ETH_balance += entryETH;
                await user.save();
                bet.status = 'refund';
                await bet.save();
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
                                if (bet.betType.equals("high")) {
                                    bet.prize = 0;
                                    bet.status = "lost"
                                } else {
                                    bet.prize = bet.entryFee * BET_2_3_LOW;
                                    bet.status = "win"
                                }
                                bet.prize = bet.entryFee * BET_2_3_LOW;
                                bet.status = "win"
                                break;
                            case 3:
                                if (bet.betType.equals("high"))
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
                                if (bet.betType.equals("high")) {
                                    bet.prize = 0;
                                    bet.status = "lost"
                                } else {
                                    bet.prize = bet.entryFee * BET_3_4_LOW;
                                    bet.status = "win"
                                }
                                break;
                            case 4:
                                if (bet.betType.equals("high"))
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
                                if (bet.betType.equals("high")) {
                                    bet.prize = 0;
                                    bet.status = "lost"
                                } else {
                                    bet.prize = bet.entryFee * BET_3_5_LOW;
                                    bet.status = "win"
                                }
                                break;
                            case 4:
                                if (bet.betType.equals("high")) {
                                    bet.prize = 0;
                                    bet.status = "lost"
                                } else {
                                    bet.prize = bet.entryFee * BET_4_5_LOW;
                                    bet.status = "win"
                                }
                                break;
                            case 5:
                                if (bet.betType.equals("high")) {
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
                                if (bet.betType.equals("high")) {
                                    bet.prize = 0;
                                    bet.status = "lost"
                                } else {
                                    bet.prize = bet.entryFee * BET_4_6_LOW;
                                    bet.status = "win"
                                }
                                break;
                            case 5:
                                if (bet.betType.equals("high")) {
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
                    await addPrizeTransaction(bet.userId, bet.prize);

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
        }).populate('participants');
        console.log(event);
        if (!event)
            return;

        if (String(event.sportId) === '650e0b6fb80ab879d1c142c8') {
            updateNFLBet(event);
        }
        if (String(event.sportId) === String('65108fcf4fa2698548371fc0')) {
            updateMLBBet(event);
        }
        if (String(event.sportId) === '65131974db50d0c2c8bf7aa7') {
            updateSoccerBet(event);
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
    } catch (error) {
        console.log(error);
    }
}
const checkEvents = async () => {
    try {
        let events = await Event.find({ state: 2 });
        for (let event of events) {            
            if (String(event.sportId) === '650e0b6fb80ab879d1c142c8') {
                console.log("NFL ", event._id);
                updateNFLBet(event);
            }
            if (String(event.sportId) === String('65108fcf4fa2698548371fc0')) {
                console.log("MLB ", event._id);
                updateMLBBet(event);
            }
            if (String(event.sportId) === '65131974db50d0c2c8bf7aa7') {
                console.log("Soccer ", event._id);
                updateSoccerBet(event);
            }
        }
    } catch (error) {
        console.log(error);
    }
}
module.exports = {
    getWeeklyEventsNFL,
    getWeeklyEventsMLB,
    getLiveDataByEvent,
    getWeeklyEventsSoccer,
    getWeekEventAll,
    remove,
    testBet,
    checkEvents
}