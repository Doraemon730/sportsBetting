const { ObjectId } = require('mongodb');
const axios = require('axios');
require('../utils/log');
const apiOddsKey = process.env.ODDS_API_KEY;
const apiNBAKey = process.env.NBA_API_KEY;
const apiNFLKey = process.env.NFL_API_KEY;
const apiNHLKey = process.env.NHL_API_KEY;
const apiMLBKey = process.env.MLB_API_KEY;
const apiCFBKey = process.env.NCAA_API_KEY;
const SOCCER_API_KEY = process.env.SOCCER_API_KEY;
const {
    NBA_API_BASEURL,
    LOCALE,
    NFL_API_BASEURL,
    NHL_API_BASEURL,
    NHL_COMPETITION_ID,
    SOCCER_API_BASEURL,
    MLB_API_BASEURL,
    ODDS_API_BASEURL,
    NFL_COMPETITION_ID,
    MLB_COMPETITION_ID,
    UEFA_COMPETITION_ID,
    LALIGA_COMPETITION_ID,
    PREMEIER_LEAGUE_COMPETITION_ID,
    SERIEA_COMPETITION_ID,
    LIGUE1_COMPETITION_ID,
    BUNDESLIGA_COMPETITION_ID,
    MLS_COMPETITION_ID,
    SAUDI_COMPETITION_ID,
    ODDS_COM_API_BASEURL,
    CFB_COMPETITION_ID,
    CFB_API_BASEURL,
    NBA_COMPETITION_ID
} = require('../config/constant');

const fetchEventMapping = async () => {
    return axios.get(`${ODDS_API_BASEURL}/${LOCALE}/sport_events/mappings.json?api_key=${apiOddsKey}`)
        .then(response => {

            const mappings = response.data.mappings//response.data.mappings;        
            return mappings;
        })
        .catch(error => {
            console.log('Error retrieving Event Mapping:' + error);
        });
}

const fetchPlayerMapping = async (start) => {
    //return axios.get(`${ODDS_API_BASEURL}/${LOCALE}/players/mappings.json?api_key=${apiOddsKey}&start=${start}&limit=1000`)
    return axios.get(`${ODDS_COM_API_BASEURL}/${LOCALE}/us/players/id_mappings.json?api_key=8wrcd5tcqhpdw77fwp2qnv3t&start=${start}&limit=30000`)
        .then(response => {
            const mappings = response.data.player_mappings;//;
            console.log(mappings.length);
            return mappings;
        })
        .catch(error => {
            console.log('Error retrieving Player Mapping' + error);
        });
}
const fetchWeeklyEventsNFL = async () => {
    return axios.get(`${ODDS_API_BASEURL}/${LOCALE}/competitions/${NFL_COMPETITION_ID}/schedules.json?api_key=${apiOddsKey}&offset=0&limit=16&start=0`)
        .then(response => {
            const events = response.data.schedules;

            return events;
        })
        .catch(error => {
            console.log('Error retrieving NFL Events:' + error);
        });
}

const fetchWeeklyEventsNHL = async () => {
    return axios.get(`${ODDS_API_BASEURL}/${LOCALE}/competitions/${NHL_COMPETITION_ID}/schedules.json?api_key=${apiOddsKey}&offset=0&limit=16&start=0`)
        .then(response => {
            const events = response.data.schedules;

            return events;
        })
        .catch(error => {
            console.log('Error retrieving NHL Events:' + error);
        });
}
const fetchWeeklyEventsMLB = async () => {
    return axios.get(`${ODDS_API_BASEURL}/${LOCALE}/competitions/${MLB_COMPETITION_ID}/schedules.json?api_key=${apiOddsKey}`)
        .then(response => {
            const events = response.data.schedules;

            return events;
        })
        .catch(error => {
            console.log('Error retrieving MLB Events:' + error);
        });
}

const fetchWeeklyEventsCFB = async () => {
    return axios.get(`${ODDS_API_BASEURL}/${LOCALE}/competitions/${CFB_COMPETITION_ID}/schedules.json?api_key=${apiOddsKey}`)
        .then(response => {
            const events = response.data.schedules;

            return events;
        })
        .catch(error => {
            console.log('Error retrieving MLB Events:' + error);
        });
}

const fetchWeeklyEventsNBA = async () => {
    return axios.get(`${ODDS_API_BASEURL}/${LOCALE}/competitions/${NBA_COMPETITION_ID}/schedules.json?api_key=${apiOddsKey}`)
        .then(response => {
            const events = response.data.schedules;

            return events;
        })
        .catch(error => {
            console.log('Error retrieving MLB Events:' + error);
        });
}


const fetchEventPlayerProps = async (event) => {
    return axios.get(`${ODDS_API_BASEURL}/${LOCALE}/sport_events/${event}/players_props.json?api_key=${apiOddsKey}`)
        .then(response => {
            const playerProps = response.data.sport_event_players_props.players_props ?
                response.data.sport_event_players_props.players_props : response.data.sport_event_players_props.players_markets;

            return playerProps;
        })
        .catch(error => {
            console.log('Error retrieving Odds Props' + error);
        });
}

const fetchNFLGameSummary = async (matchId) => {
    return axios.get(`${NFL_API_BASEURL}/${LOCALE}/games/${matchId}/statistics.json?api_key=${apiNFLKey}`)
        .then(response => {
            const statistics = response.data;
            return statistics;
        })
        .catch(error => {
            console.log('Error retrieving NFL Summary:' + error);
        });
}

const fetchNBAGameSummary = async (matchId) => {
    console.log(`${NBA_API_BASEURL}/${LOCALE}/games/${matchId}/summary.json?api_key=${apiNBAKey}`);
    return axios.get(`${NBA_API_BASEURL}/${LOCALE}/games/${matchId}/summary.json?api_key=${apiNBAKey}`)
    .then(response => {
        const statistics = response.data;
        return statistics;
    })
    .catch(error => {
        console.log('Error retrieving NBA Summary:' + error);
    });
}

const fetchCFBGameSummary = async (matchId) => {
    return axios.get(`${CFB_API_BASEURL}/${LOCALE}/games/${matchId}/statistics.json?api_key=${apiCFBKey}`)
        .then(response => {
            const statistics = response.data;
            return statistics;
        })
        .catch(error => {
            console.log('Error retrieving NFL schedule:' + error);
        });
}
const fetchNHLGameSummary = async (matchId) => {
    return axios.get(`${NHL_API_BASEURL}/${LOCALE}/games/${matchId}/summary.json?api_key=${apiNHLKey}`)
        .then(response => {
            const statistics = response.data;
            return statistics;
        })
        .catch(error => {
            console.log('Error retrieving NFL schedule:' + error);
        });
}

const fetchMLBGameSummary = async (matchId) => {
    return axios.get(`${MLB_API_BASEURL}/${LOCALE}/games/${matchId}/summary.json?api_key=${apiMLBKey}`)
        .then(response => {
            const summary = response.data;
            return summary;
        })
        .catch(error => {
            console.log('Error retrieving MLB schedule:' + error);
        });
}
// Soccer Games
const fetchWeeklyEventsSaudi = async () => {
    return axios.get(`${ODDS_API_BASEURL}/${LOCALE}/competitions/${SAUDI_COMPETITION_ID}/schedules.json?api_key=${apiOddsKey}&offset=0&limit=10&start=0`)
        .then(response => {
            const events = response.data.schedules;
            return events;
        })
        .catch(error => {
            console.log('Error retrieving MLB Events:' + error);
        });
}
const fetchWeeklyEventsUEFA = async () => {
    return axios.get(`${ODDS_API_BASEURL}/${LOCALE}/competitions/${UEFA_COMPETITION_ID}/schedules.json?api_key=${apiOddsKey}&offset=0&limit=10&start=0`)
        .then(response => {
            const events = response.data.schedules;
            return events;
        })
        .catch(error => {
            console.log('Error retrieving MLB Events:' + error);
        });
}
const fetchWeeklyEventsLaLiga = async () => {
    return axios.get(`${ODDS_API_BASEURL}/${LOCALE}/competitions/${LALIGA_COMPETITION_ID}/schedules.json?api_key=${apiOddsKey}&offset=0&limit=10&start=0`)
        .then(response => {
            const events = response.data.schedules;
            return events;
        })
        .catch(error => {
            console.log('Error retrieving MLB Events:' + error);
        });
}
const fetchWeeklyEventsPremierLeague = async () => {
    return axios.get(`${ODDS_API_BASEURL}/${LOCALE}/competitions/${PREMEIER_LEAGUE_COMPETITION_ID}/schedules.json?api_key=${apiOddsKey}&offset=0&limit=10&start=0`)
        .then(response => {
            const events = response.data.schedules;
            return events;
        })
        .catch(error => {
            console.log('Error retrieving MLB Events:' + error);
        });
}
const fetchWeeklyEventsSerieA = async () => {
    return axios.get(`${ODDS_API_BASEURL}/${LOCALE}/competitions/${SERIEA_COMPETITION_ID}/schedules.json?api_key=${apiOddsKey}&offset=0&limit=10&start=0`)
        .then(response => {
            const events = response.data.schedules;
            return events;
        })
        .catch(error => {
            console.log('Error retrieving MLB Events:' + error);
        });
}
const fetchWeeklyEventsLigue1 = async () => {
    return axios.get(`${ODDS_API_BASEURL}/${LOCALE}/competitions/${LIGUE1_COMPETITION_ID}/schedules.json?api_key=${apiOddsKey}&offset=0&limit=10&start=0`)
        .then(response => {
            const events = response.data.schedules;
            return events;
        })
        .catch(error => {
            console.log('Error retrieving MLB Events:' + error);
        });
}
const fetchWeeklyEventsBundesliga = async () => {
    return axios.get(`${ODDS_API_BASEURL}/${LOCALE}/competitions/${BUNDESLIGA_COMPETITION_ID}/schedules.json?api_key=${apiOddsKey}&offset=0&limit=10&start=0`)
        .then(response => {
            const events = response.data.schedules;
            return events;
        })
        .catch(error => {
            console.log('Error retrieving MLB Events:' + error);
        });
};

const fetchWeeklyEventsMLS = async () => {
    return axios.get(`${ODDS_API_BASEURL}/${LOCALE}/competitions/${MLS_COMPETITION_ID}/schedules.json?api_key=${apiOddsKey}&offset=0&limit=3&start=0`)
        .then(response => {
            const events = response.data.schedules;
            return events;
        })
        .catch(error => {
            console.log('Error retrieving MLB Events:' + error);
        });
};

const fetchSoccerPlayerProps = async (event) => {
    console.log(event);
    return axios.get(`${ODDS_API_BASEURL}/${LOCALE}/sport_events/${event}/players_props.json?api_key=${apiOddsKey}`)
        .then(response => {
            const markets = response.data.sport_event_players_props.players_markets.markets;

            return markets;
        })
        .catch(error => {
            console.log('Error retrieving NBA schedule:' + error);
        });
};

const fetchSoccerEventSummary = async (eventId) => {
    return axios.get(`${SOCCER_API_BASEURL}/${LOCALE}/sport_events/${eventId}/summary.json?api_key=${SOCCER_API_KEY}`)
        .then(response => {
            const statistics = response.data;
            return statistics;
        })
        .catch(error => {
            console.log('Error retrieving Soccer Event Summary' + error);
        })
}

module.exports = {
    fetchWeeklyEventsNFL,
    fetchEventPlayerProps,
    fetchEventMapping,
    fetchWeeklyEventsMLB,
    fetchPlayerMapping,
    fetchNFLGameSummary,
    fetchMLBGameSummary,
    fetchSoccerPlayerProps,
    fetchWeeklyEventsUEFA,
    fetchWeeklyEventsLaLiga,
    fetchWeeklyEventsPremierLeague,
    fetchWeeklyEventsSerieA,
    fetchWeeklyEventsLigue1,
    fetchWeeklyEventsBundesliga,
    fetchWeeklyEventsMLS,
    fetchWeeklyEventsSaudi,
    fetchSoccerEventSummary,
    fetchWeeklyEventsNHL,
    fetchNHLGameSummary,
    fetchWeeklyEventsCFB,
    fetchCFBGameSummary,
    fetchWeeklyEventsNBA,
    fetchNBAGameSummary
};

