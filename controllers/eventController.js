const Event = require('../models/Event');
const Player = require('../models/Player');
const Prop = require('../models/Prop');
const Team = require('../models/Team');
const request = require('request')
const { NFL_LIVEDATA_BASEURL, MLB_LIVEDATA_BASEURL, NHL_LIVEDATA_BASEURL } = require('../config/constant');
const { ObjectId } = require("mongodb");
const {fetchWeeklyEventsNFL, fetchEventPlayerProps, fetchEventMapping, fetchWeeklyEventsMLB, fetchPlayerMapping} = require('../services/eventService');

const NFL_API_KEY = process.env.NFL_API_KEY;
const MLB_API_KEY = process.env.MLB_API_KEY;
const NHL_API_KEY = process.env.NHL_API_KEY;

const getWeeklyEventsNFL = async (req, res) => {
    try {
        const mappings = await fetchEventMapping();
        if (!mappings || !Array.isArray(mappings)) return res.status(400).send({ message: 'No events found' });
        const events = await fetchWeeklyEventsNFL();
        for (const event of events) {

            const myEvent = new Event({
                id: event.sport_event.id,
                startTime: event.sport_event.start_time,
                sportId: new ObjectId('650e0b6fb80ab879d1c142c8')
            });
            let alias = [];
            for (const competitor of event.sport_event.competitors) {
                const team = await Team.findOne({ srId: competitor.id });
                competitor.teamId = team._id;
                myEvent.competitors.push(competitor);
                alias.push(team.alias);
            }
            myEvent.name = alias[0] + " vs " + alias[1];

            const mapping = mappings.find(item => item.id === event.sport_event.id);
            if (mapping)
                myEvent.matchId = mapping.external_id;
            await myEvent.save();

            const playerProps = await fetchEventPlayerProps(event.sport_event.id);
            //console.log(playerProps);

            for (const playerProp of playerProps) {
                //console.log(playerProp.player.id);
                const player = await Player.findOne({ srId: playerProp.player.id });
                if (!player)
                    continue;
                for (const market of playerProp.markets) {
                    const prop = await Prop.findOne({ srId: market.id });
                    if (!player || !prop) continue;
                    const index = player.odds.findIndex((odd) => odd.id === prop.id);
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
            console.log(playerProps);

        }
        res.json(events);
    } catch (error) {
        console.log(error.message);
        res.json(error.message);
    }
}

const getWeeklyEventsMLB = async (req, res) => {
    try {
        const mappings = await fetchEventMapping();        
        if (!mappings || !Array.isArray(mappings)) return res.status(400).send({ message: 'No events found' });
        //console.log(mappings);        
        const players = await fetchPlayerMapping();
        if (!players || !Array.isArray(players)) return res.status(400).send({message: 'No players found'});
        
        const events = await fetchWeeklyEventsMLB();
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
            await myEvent.save();

            const playerProps = await fetchEventPlayerProps(event.sport_event.id);
            //console.log(playerProps);

            for (const playerProp of playerProps) {
                console.log(playerProp.player.id);
                console.log(playerProp.player.name);
                const play = players.find(item => item.id === playerProp.player.id);
                if(!play)
                    continue;
                const player = await Player.findOne({remoteId: play.external_id});
                if(!player)
                    continue;
                console.log(player);
                for (const market of playerProp.markets) {
                    const prop = await Prop.findOne({ srId: market.id });
                    if (!prop) continue;
                    const index = player.odds.findIndex((odd) => odd.id === prop.id);
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
        res.json(events);
    } catch (error) {
        console.log(error.message);
        res.json(error.message);
    }
};
const remove = async (req, res) => {
    try {
        await Event.deleteMany({ sportId: new ObjectId('65108fcf4fa2698548371fc0') });
        res.json("Success");
    } catch (error) {
        res.status(500).send("Server Error");
    }
};

const getLiveDataByEvent = async () => {
    try {
        const events = await Event.find();
        for (const event of events) {
            if (event.status == 0 && event.startTime <= new Date().now()) {
                url = ""
                let sportType = ""
                if (event.sportId == '650e0b6fb80ab879d1c142c8') {
                    url = `${NFL_LIVEDATA_BASEURL}=${NFL_API_KEY}&match=sd:match:${event.matchId}`
                    sportType = "NFL"
                }
                // if (event.sportId == '65108faf4fa2698548371fbd') {
                //     url = `${NHL_LIVEDATA_BASEURL}=${NHL_API_KEY}&match=sd:match:${event.matchId}`
                //     sportType = "NHL"
                // }
                if (event.sportId == '65108fcf4fa2698548371fc0') {
                    url = `${MLB_LIVEDATA_BASEURL}=${MLB_API_KEY}&match=sd:match:${event.matchId}`
                    sportType = "MLB"
                }
                Event.updateOne({ _id: event._id }, { $set: { state: 1 } })
                let broadcastingData = { eventId: event._id }
                const stream = request(url);
                const isCompleted = false;
                stream.on('data', (chunk) => {
                    // Process the incoming data chunk here
                    const jsonData = JSON.parse(chunk.toString());
                    if (jsonData.hasOwnProperty('payload')) {
                        const detailData = jsonData['payload'];
                        if (detailData.hasOwnProperty('player')) {
                            if (sportType == "NFL") {
                                broadcastingData.player = getNFLData(detailData);
                            }
                            // if (sportType == "NHL") {
                            //     broadcastingData.player = getNHLData(detailData);
                            // }
                            if (sportType == "MLB") {
                                broadcastingData.player = getMLBData(detailData);
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
                        Event.updateOne({ _id: event._id }, { $set: { state: 2 } })
                        stream.abort();
                    }
                });
                // Handle errors
                stream.on('error', (error) => {
                    console.error('Error:', error);
                });

                // Handle the end of the stream
                stream.on('end', () => {
                    console.log('Stream ended');
                });

            }
        }
    } catch (error) {
        throw new Error(error.message);
    }
}

const getNFLData = (detailData) => {
    const player = { id: detailData.player.id, name: detailData.player.name }
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
    const player = { id: detailData.player.id, name: detailData.player.first_name + " " + detailData.player.last_name }
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
}

module.exports = {
    getWeeklyEventsNFL,
    getWeeklyEventsMLB,
    getLiveDataByEvent,
    remove
}