const Event = require('../models/Event');
const Player = require('../models/Player');
const Prop = require('../models/Prop');
const Team = require('../models/Team');
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
    fetchWeeklyEventsMLS
} = require('../services/eventService');

const {
    fetchSoccerPlayerProfile
} = require('../services/playerService');
const NFL_API_KEY = process.env.NFL_API_KEY;
const MLB_API_KEY = process.env.MLB_API_KEY;
const NHL_API_KEY = process.env.NHL_API_KEY;

const getWeeklyEventsNFL = async (req, res) => {
    try {
        const mappings = await fetchEventMapping();
        if (!mappings || !Array.isArray(mappings)) return res.status(400).send({
            message: 'No events found'
        });
        const events = await fetchWeeklyEventsNFL();
        for (const event of events) {

            const myEvent = new Event({
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
            await myEvent.save();

            const playerProps = await fetchEventPlayerProps(event.sport_event.id);
            //console.log(playerProps);

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
                    const index = player.odds.findIndex((odd) => odd.id === prop._id);
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
        if (!mappings || !Array.isArray(mappings)) return res.status(400).send({
            message: 'No events found'
        });
        //console.log(mappings);        
        const players = await fetchPlayerMapping();
        if (!players || !Array.isArray(players)) return res.status(400).send({
            message: 'No players found'
        });

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
                    const index = player.odds.findIndex((odd) => odd.id === prop._id);
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

const getWeeklyEventsUEFA = async (req, res) => {
    try{
        const mappings = await fetchEventMapping();
        if (!mappings || !Array.isArray(mappings)) return res.status(400).send({
            message: 'No events found'
        });
        const events = await fetchWeeklyEventsUEFA();
        for(const event of events) {
            const myEvent = new Event({
                id: event.sport_event.id,
                startTime: event.sport_event.start_time,
                sportId: new ObjectId('65131974db50d0c2c8bf7aa7')
            });
            let alias = [];
            for (const competitor of event.sport_event.competitors) {                
                myEvent.competitors.push(competitor);
                alias.push(competitor.abbreviation);
            }
            myEvent.name = alias[0] + " vs " + alias[1];
            const mapping = mappings.find(item => item.id === event.sport_event.id);
            if (mapping)
                myEvent.matchId = mapping.external_id;
            
            const markets = await fetchSoccerPlayerProps(event.sport_event.id);
            console.log(markets);
            const market = markets.find(item => item.name ==="anytime goalscorer");
            if(!market)
                continue;
            await myEvent.save();
            for(const play of market.books[0].outcomes){
                let player = await Player.findOne({srId: play.player_id});
                if(!player)
                {
                    console.log(play);
                    const profile = await fetchSoccerPlayerProfile(play.player_id);
                    console.log(profile);
                    player = new Player({
                        sportId: new ObjectId('65131974db50d0c2c8bf7aa7'),
                        name: profile.player.name,
                        jerseyNumber: profile.player.jersey_number,
                        position: profile.player.type,
                        srId: play.player_id,
                        teamName:profile.competitors[0].abbreviation,
                    });                    
                }
                if(player.odds.length) {
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
    } catch (error) {
        console.log(error.message);
    }
};
const getWeeklyEventsLaLiga = async (req, res) => {
    try{
        const mappings = await fetchEventMapping();
        if (!mappings || !Array.isArray(mappings)) return res.status(400).send({
            message: 'No events found'
        });
        const events = await fetchWeeklyEventsLaLiga();
        for(const event of events) {
            const myEvent = new Event({
                id: event.sport_event.id,
                startTime: event.sport_event.start_time,
                sportId: new ObjectId('65131974db50d0c2c8bf7aa7')
            });
            let alias = [];
            for (const competitor of event.sport_event.competitors) {                
                myEvent.competitors.push(competitor);
                alias.push(competitor.abbreviation);
            }
            myEvent.name = alias[0] + " vs " + alias[1];
            const mapping = mappings.find(item => item.id === event.sport_event.id);
            if (mapping)
                myEvent.matchId = mapping.external_id;
            
            const markets = await fetchSoccerPlayerProps(event.sport_event.id);
            console.log(markets);
            const market = markets.find(item => item.name ==="anytime goalscorer");
            if(!market)
                continue;
            await myEvent.save();
            for(const play of market.books[0].outcomes){
                let player = await Player.findOne({srId: play.player_id});
                if(!player)
                {
                    console.log(play);
                    const profile = await fetchSoccerPlayerProfile(play.player_id);
                    console.log(profile);
                    player = new Player({
                        sportId: new ObjectId('65131974db50d0c2c8bf7aa7'),
                        name: profile.player.name,
                        jerseyNumber: profile.player.jersey_number,
                        position: profile.player.type,
                        srId: play.player_id,
                        teamName:profile.competitors[0].abbreviation,
                    });                    
                }
                if(player.odds.length) {
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
    } catch (error) {
        console.log(error.message);
    }
};
const getWeeklyEventsPremierLeague = async (req, res) => {
    try{
        const mappings = await fetchEventMapping();
        if (!mappings || !Array.isArray(mappings)) return res.status(400).send({
            message: 'No events found'
        });
        const events = await fetchWeeklyEventsPremierLeague();
        for(const event of events) {
            const myEvent = new Event({
                id: event.sport_event.id,
                startTime: event.sport_event.start_time,
                sportId: new ObjectId('65131974db50d0c2c8bf7aa7')
            });
            let alias = [];
            for (const competitor of event.sport_event.competitors) {                
                myEvent.competitors.push(competitor);
                alias.push(competitor.abbreviation);
            }
            myEvent.name = alias[0] + " vs " + alias[1];
            const mapping = mappings.find(item => item.id === event.sport_event.id);
            if (mapping)
                myEvent.matchId = mapping.external_id;
            
            const markets = await fetchSoccerPlayerProps(event.sport_event.id);
            console.log(markets);
            const market = markets.find(item => item.name ==="anytime goalscorer");
            if(!market)
                continue;
            await myEvent.save();
            for(const play of market.books[0].outcomes){
                let player = await Player.findOne({srId: play.player_id});
                if(!player)
                {
                    console.log(play);
                    const profile = await fetchSoccerPlayerProfile(play.player_id);
                    console.log(profile);
                    player = new Player({
                        sportId: new ObjectId('65131974db50d0c2c8bf7aa7'),
                        name: profile.player.name,
                        jerseyNumber: profile.player.jersey_number,
                        position: profile.player.type,
                        srId: play.player_id,
                        teamName:profile.competitors[0].abbreviation,
                    });                    
                }
                if(player.odds.length) {
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
    } catch (error) {
        console.log(error.message);
    }
};
const getWeeklyEventsSerieA = async (req, res) => {
    try{
        const mappings = await fetchEventMapping();
        if (!mappings || !Array.isArray(mappings)) return res.status(400).send({
            message: 'No events found'
        });
        const events = await fetchWeeklyEventsSerieA();
        for(const event of events) {
            const myEvent = new Event({
                id: event.sport_event.id,
                startTime: event.sport_event.start_time,
                sportId: new ObjectId('65131974db50d0c2c8bf7aa7')
            });
            let alias = [];
            for (const competitor of event.sport_event.competitors) {                
                myEvent.competitors.push(competitor);
                alias.push(competitor.abbreviation);
            }
            myEvent.name = alias[0] + " vs " + alias[1];
            const mapping = mappings.find(item => item.id === event.sport_event.id);
            if (mapping)
                myEvent.matchId = mapping.external_id;
            
            const markets = await fetchSoccerPlayerProps(event.sport_event.id);
            console.log(markets);
            const market = markets.find(item => item.name ==="anytime goalscorer");
            if(!market)
                continue;
            await myEvent.save();
            for(const play of market.books[0].outcomes){
                let player = await Player.findOne({srId: play.player_id});
                if(!player)
                {
                    console.log(play);
                    const profile = await fetchSoccerPlayerProfile(play.player_id);
                    console.log(profile);
                    player = new Player({
                        sportId: new ObjectId('65131974db50d0c2c8bf7aa7'),
                        name: profile.player.name,
                        jerseyNumber: profile.player.jersey_number,
                        position: profile.player.type,
                        srId: play.player_id,
                        teamName:profile.competitors[0].abbreviation,
                    });                    
                }
                if(player.odds.length) {
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
    } catch (error) {
        console.log(error.message);
    }
};
const getWeeklyEventsLigue1 = async (req, res) => {
    try{
        const mappings = await fetchEventMapping();
        if (!mappings || !Array.isArray(mappings)) return res.status(400).send({
            message: 'No events found'
        });
        const events = await fetchWeeklyEventsLigue1();
        for(const event of events) {
            const myEvent = new Event({
                id: event.sport_event.id,
                startTime: event.sport_event.start_time,
                sportId: new ObjectId('65131974db50d0c2c8bf7aa7')
            });
            let alias = [];
            for (const competitor of event.sport_event.competitors) {                
                myEvent.competitors.push(competitor);
                alias.push(competitor.abbreviation);
            }
            myEvent.name = alias[0] + " vs " + alias[1];
            const mapping = mappings.find(item => item.id === event.sport_event.id);
            if (mapping)
                myEvent.matchId = mapping.external_id;
            
            const markets = await fetchSoccerPlayerProps(event.sport_event.id);
            console.log(markets);
            const market = markets.find(item => item.name ==="anytime goalscorer");
            if(!market)
                continue;
            await myEvent.save();
            for(const play of market.books[0].outcomes){
                let player = await Player.findOne({srId: play.player_id});
                if(!player)
                {
                    console.log(play);
                    const profile = await fetchSoccerPlayerProfile(play.player_id);
                    console.log(profile);
                    player = new Player({
                        sportId: new ObjectId('65131974db50d0c2c8bf7aa7'),
                        name: profile.player.name,
                        jerseyNumber: profile.player.jersey_number,
                        position: profile.player.type,
                        srId: play.player_id,
                        teamName:profile.competitors[0].abbreviation,
                    });                    
                }
                if(player.odds.length) {
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
    } catch (error) {
        console.log(error.message);
    }
};
const getWeeklyEventsBundesliga = async (req, res) => {
    try{
        const mappings = await fetchEventMapping();
        if (!mappings || !Array.isArray(mappings)) return res.status(400).send({
            message: 'No events found'
        });
        const events = await fetchWeeklyEventsBundesliga();
        for(const event of events) {
            const myEvent = new Event({
                id: event.sport_event.id,
                startTime: event.sport_event.start_time,
                sportId: new ObjectId('65131974db50d0c2c8bf7aa7')
            });
            let alias = [];
            for (const competitor of event.sport_event.competitors) {                
                myEvent.competitors.push(competitor);
                alias.push(competitor.abbreviation);
            }
            myEvent.name = alias[0] + " vs " + alias[1];
            const mapping = mappings.find(item => item.id === event.sport_event.id);
            if (mapping)
                myEvent.matchId = mapping.external_id;
            
            const markets = await fetchSoccerPlayerProps(event.sport_event.id);
            console.log(markets);
            const market = markets.find(item => item.name ==="anytime goalscorer");
            if(!market)
                continue;
            await myEvent.save();
            for(const play of market.books[0].outcomes){
                let player = await Player.findOne({srId: play.player_id});
                if(!player)
                {
                    console.log(play);
                    const profile = await fetchSoccerPlayerProfile(play.player_id);
                    console.log(profile);
                    player = new Player({
                        sportId: new ObjectId('65131974db50d0c2c8bf7aa7'),
                        name: profile.player.name,
                        jerseyNumber: profile.player.jersey_number,
                        position: profile.player.type,
                        srId: play.player_id,
                        teamName:profile.competitors[0].abbreviation,
                    });                    
                }
                if(player.odds.length) {
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
    } catch (error) {
        console.log(error.message);
    }
};
const getWeeklyEventsMLS = async (req, res) => {
    try{
        const mappings = await fetchEventMapping();
        if (!mappings || !Array.isArray(mappings)) return res.status(400).send({
            message: 'No events found'
        });
        const events = await fetchWeeklyEventsMLS();
        for(const event of events) {
            const myEvent = new Event({
                id: event.sport_event.id,
                startTime: event.sport_event.start_time,
                sportId: new ObjectId('65131974db50d0c2c8bf7aa7')
            });
            let alias = [];
            for (const competitor of event.sport_event.competitors) {                
                myEvent.competitors.push(competitor);
                alias.push(competitor.abbreviation);
            }
            myEvent.name = alias[0] + " vs " + alias[1];
            const mapping = mappings.find(item => item.id === event.sport_event.id);
            if (mapping)
                myEvent.matchId = mapping.external_id;
            
            const markets = await fetchSoccerPlayerProps(event.sport_event.id);
            console.log(markets);
            const market = markets.find(item => item.name ==="anytime goalscorer");
            if(!market)
                continue;
            await myEvent.save();
            for(const play of market.books[0].outcomes){
                let player = await Player.findOne({srId: play.player_id});
                if(!player)
                {
                    console.log(play);
                    const profile = await fetchSoccerPlayerProfile(play.player_id);
                    console.log(profile);
                    player = new Player({
                        sportId: new ObjectId('65131974db50d0c2c8bf7aa7'),
                        name: profile.player.name,
                        jerseyNumber: profile.player.jersey_number,
                        position: profile.player.type,
                        srId: play.player_id,
                        teamName:profile.competitors[0].abbreviation,
                    });                    
                }
                if(player.odds.length) {
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
    } catch (error) {
        console.log(error.message);
    }
};
const getWeeklyEventsSoccer = async(req, res) => {
    try{
        await getWeeklyEventsUEFA();
        await getWeeklyEventsLaLiga();
        await getWeeklyEventsPremierLeague();
        await getWeeklyEventsSerieA();
        await getWeeklyEventsLigue1();
        await getWeeklyEventsBundesliga();
        await getWeeklyEventsMLS();
        res.json("success");
    } catch(error) {
        console.log(error.message);
        res.status(500).send(error.message);
    }
};
const remove = async (req, res) => {
    try {
        await Event.deleteMany({
            sportId: new ObjectId('65131974db50d0c2c8bf7aa7')
        });
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
                await Event.updateOne({
                    _id: event._id
                }, {
                    $set: {
                        state: 1
                    }
                })
                let broadcastingData = {
                    eventId: event._id
                }
                const stream = request(url);
                const isCompleted = false;
                stream.on('data', async (chunk) => {
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
                        await Event.updateOne({
                            _id: event._id
                        }, {
                            $set: {
                                state: 2
                            }
                        })

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
        const statistics = await fetchNFLGameSummary(event.matchId);
        console.log("summary", JSON.stringify(statistics));
        const rushingStats = summarizeStatsByPlayer(statistics, 'rushing');
        const receivingStats = summarizeStatsByPlayer(statistics, 'receiving');
        const passingStats = summarizeStatsByPlayer(statistics, 'passing');
        const fieldGoalStats = summarizeStatsByPlayer(statistics, 'field_goals');
        const defenseStats = summarizeStatsByPlayer(statistics, 'defense');
        for(const bet of event.particiapnts){
            //const pick = bet.picks.find(item => item.contestId === event._id);
            let finished = 0, win = 0;
            for(const pick of bet.picks) {
                if(pick.contestId.equals(event._id)){
                    let result, play;
                    const player = await Player.findById(pick.playerId);
                    switch(pick.prop.propName){
                        case 'Rush Yards':
                            play = rushingStats.find(item=> item.player === player.name);
                            result = play.yards;
                            
                            break;
                        case 'Pass Yards':
                            play = passingStats.find(item=> item.player === player.name);
                            result = play.yards;
                            break;
                        case 'Pass Attempts':
                            play = passingStats.find(item=> item.player === player.name);
                            result = play.attempts;
                            break;
                        case 'Pass Completions':
                            play = passingStats.find(item=> item.player === player.name);
                            result = play.completions;
                            break;
                        case 'Pass TDs':
                            play = passingStats.find(item=> item.player === player.name);
                            result = play.touchdown;
                            break;
                        case 'INT':
                            play = passingStats.find(item=> item.player === player.name);
                            result = play.interceptions;
                            break;
                        case 'Receiving Yards':
                            play = receivingStats.find(item=> item.player === player.name);
                            result = play.yards;
                            break;
                        case 'Receptions':
                            play = receivingStats.find(item=> item.player === player.name);
                            result = play.receptions;
                            break;
                        case 'FG Made':
                            play = fieldGoalStats.find(item => item.player === player.name);
                            result = play.made;
                            break;
                        case 'Tackles+Ast':
                            break;
                    }
                    pick.result = result;
                    bet.picks[bet.picks.indexOf(pick)] = pick;
                }
                if(pick.result) {
                    finished += 1;
                    if (pick.overUnder == "over" && pick.result > pick.prop.odds ||
                        pick.overUnder == "under" && pick.result < pick.prop.odds) {
                        win += 1;
                    }
                }
            }
            if (finished == bet.picks.length) {
                if (bet.parlay) {
                  switch (bet.parlayIndex) {
                    case 1:
                    case 2:
                    case 3:
                    case 4:
                    case 5:
                      const betDate = bet.createdAt;
                      betDate.setTime(0, 0, 0, 0);
                      const nextBet = await Bet.findOne({
                        userId: bet.userId,
                        createdAt: {
                          $gte: today,
                          $lt: new Date(today.getTime() + 86400000),
                        },
                        parlay: true,
                        parlayIndex: bet.parlayIndex + 1
                      });
                      if (!nextBet)
                        return;
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
                            case 3:                             
                              bet.prize = bet.entryFee * BET_3_3_HIGH;                              
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
                            case 4:                             
                              bet.prize = bet.entryFee * BET_4_4_HIGH;                             
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
                            case 5:
                              bet.prize = bet.entryFee * BET_5_5_LOW;
                              bet.status = "win"
                              break;
                              defaut:
                              bet.prize = 0;
                              bet.status = "lost";
                              break;
                          }
                          break;
                        case 6:
                          switch (win) {                           
                            case 6:
                              bet.prize = bet.entryFee * BET_6_6_LOW;
                              bet.status = "win"
                              break;
                              defaut:
                              bet.prize = 0;
                              bet.status = "lost"
                              break;
                          }
                          break;
                        default:
                          break;
                      }
                      nextBet.entryFee = bet.prize;
                      await nextBet.save();
                      break;
                    case 6:
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
                            case 3:
                            bet.prize = bet.entryFee * BET_3_3_HIGH;                             
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
                            case 4:                              
                              bet.prize = bet.entryFee * BET_4_4_HIGH;
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
                           
                            case 5:
                              bet.prize = bet.entryFee * BET_5_5_LOW;
                              bet.status = "win"
                              break;
                              defaut:
                              bet.prize = 0;
                              bet.status = "lost";
                              break;
                          }
                          break;
                        case 6:
                          switch (win) {                           
                            case 6:
                              bet.prize = bet.entryFee * BET_6_6_LOW;
                              bet.status = "win"
                              break;
                            defaut:
                              bet.prize = 0;
                              bet.status = "lost"
                              break;
                          }
                          break;
                        default:
                          break;
                      }
                      if (bet.status == "win") {
      
                        await addPrizeTransaction(bet.userId, bet.prize);
      
                      }
                      break;
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
                          bet.prize = bet.entryFee * BET_3_4_LOW;
                          bet.status = "win"
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
                          bet.prize = bet.entryFee * BET_3_5_LOW;
                          bet.status = "win"
                          break;
                        case 4:
                          bet.prize = bet.entryFee * BET_4_5_LOW;
                          bet.status = "win"
                          break;
                        case 5:
                          bet.prize = bet.entryFee * BET_5_5_LOW;
                          bet.status = "win"
                          break;
                          defaut:
                          bet.prize = 0;
                          bet.status = "lost";
                          break;
                      }
                      break;
                    case 6:
                      switch (win) {
                        case 4:
                          bet.prize = bet.entryFee * BET_4_6_LOW;
                          bet.status = "win"
                          break;
                        case 5:
                          bet.prize = bet.entryFee * BET_5_6_LOW;
                          bet.status = "win"
                          break;
                        case 6:
                          bet.prize = bet.entryFee * BET_6_6_LOW;
                          bet.status = "win"
                          break;
                          defaut:
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
                }
                if (bet.status == 'win') {
                  const user = await User.findById(bet.userId);
                  if (user) {
                    user.wins += 1;
                   
                  }
                  await user.save();
                  await updateCapital(3, await USD2Ether(bet.prize - bet.entryFee));
                } else {
                  await updateCapital(2, await USD2Ether(bet.entryFee));
                }
              }
      
              await bet.save();
            
        }

    } catch (error) {
        console.log(error.message);
    }
};

const updateBet = async (eventId) => {
    try {
        const event = await Event.findOne({
            _id: eventId
        }).populate('participants');
        if (!event)
            return;
        if (event.sportId === new ObjectId('650e0b6fb80ab879d1c142c8')) {
            updateNFLBet(event);
        }
    } catch (error) {
        console.log(error.message);
    }
}

module.exports = {
    getWeeklyEventsNFL,
    getWeeklyEventsMLB,
    getLiveDataByEvent,
    getWeeklyEventsSoccer,
    remove
}