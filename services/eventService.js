const { ObjectId } = require('mongodb');
const axios = require('axios');

const apiOddsKey = process.env.ODDS_API_KEY;
const apiNBAKey = process.env.NBA_API_KEY;
const apiNFLKey = process.env.NFL_API_KEY;
const apiNHLKey = process.env.NHL_API_KEY;
const apiMLBKey = process.env.MLB_API_KEY;
const {
  NBA_API_BASEURL,
  LOCALE,
  NFL_API_BASEURL,
  NHL_API_BASEURL,
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
  MLS_COMPETITION_ID
} = require('../config/constant');

const fetchEventMapping = async () => {
    return axios.get(`${ODDS_API_BASEURL}/${LOCALE}/sport_events/mappings.json?api_key=${apiOddsKey}`)
    .then(response => {

        const mappings = response.data.mappings;        
        return mappings;
    })
    .catch(error => {
        console.log('Error retrieving Event Mapping:' + error);
    });
}

const fetchPlayerMapping = async () => {
    return axios.get(`${ODDS_API_BASEURL}/${LOCALE}/players/mappings.json?api_key=${apiOddsKey}`)
    .then(response => {
        const mappings = response.data.mappings;
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

const fetchEventPlayerProps = async (event) => {
    return axios.get(`${ODDS_API_BASEURL}/${LOCALE}/sport_events/${event}/players_props.json?api_key=${apiOddsKey}`)
  .then(response => {
    const playerProps = response.data.sport_event_players_props.players_props;

    return playerProps;
  })
  .catch(error => {
    console.log('Error retrieving NBA schedule:' + error);
  });
}

const fetchNFLGameSummary = async (matchId) => {
    return axios.get(`${NFL_API_BASEURL}/${LOCALE}/games/${matchId}/statistics.json?api_key=${apiNFLKey}`)
    .then(response => {
        const statistics = response.data.statistics;
        return statistics;
    })
    .catch(error => {
        console.log('Error retrieving NFL schedule:' + error);
    });
}
// Soccer Games
const fetchWeeklyEventsUEFA = async () => {
    return axios.get(`${ODDS_API_BASEURL}/${LOCALE}/competitions/${UEFA_COMPETITION_ID}/schedules.json?api_key=${apiOddsKey}&limit=10`)
    .then(response => {
        const events = response.data.schedules;        
        return events;
    })
    .catch(error => {
        console.log('Error retrieving MLB Events:' + error);
    });
}
const fetchWeeklyEventsLaLiga = async () => {
    return axios.get(`${ODDS_API_BASEURL}/${LOCALE}/competitions/${LALIGA_COMPETITION_ID}/schedules.json?api_key=${apiOddsKey}`)
    .then(response => {
        const events = response.data.schedules;        
        return events;
    })
    .catch(error => {
        console.log('Error retrieving MLB Events:' + error);
    });
}
const fetchWeeklyEventsPremierLeague = async () => {
    return axios.get(`${ODDS_API_BASEURL}/${LOCALE}/competitions/${PREMEIER_LEAGUE_COMPETITION_ID}/schedules.json?api_key=${apiOddsKey}`)
    .then(response => {
        const events = response.data.schedules;        
        return events;
    })
    .catch(error => {
        console.log('Error retrieving MLB Events:' + error);
    });
}
const fetchWeeklyEventsSerieA = async () => {
    return axios.get(`${ODDS_API_BASEURL}/${LOCALE}/competitions/${SERIEA_COMPETITION_ID}/schedules.json?api_key=${apiOddsKey}`)
    .then(response => {
        const events = response.data.schedules;        
        return events;
    })
    .catch(error => {
        console.log('Error retrieving MLB Events:' + error);
    });
}
const fetchWeeklyEventsLigue1 = async () => {
    return axios.get(`${ODDS_API_BASEURL}/${LOCALE}/competitions/${LIGUE1_COMPETITION_ID}/schedules.json?api_key=${apiOddsKey}`)
    .then(response => {
        const events = response.data.schedules;        
        return events;
    })
    .catch(error => {
        console.log('Error retrieving MLB Events:' + error);
    });
}
const fetchWeeklyEventsBundesliga = async () => {
    return axios.get(`${ODDS_API_BASEURL}/${LOCALE}/competitions/${BUNDESLIGA_COMPETITION_ID}/schedules.json?api_key=${apiOddsKey}`)
    .then(response => {
        const events = response.data.schedules;        
        return events;
    })
    .catch(error => {
        console.log('Error retrieving MLB Events:' + error);
    });
}
const fetchWeeklyEventsMLS = async () => {
    return axios.get(`${ODDS_API_BASEURL}/${LOCALE}/competitions/${MLS_COMPETITION_ID}/schedules.json?api_key=${apiOddsKey}`)
    .then(response => {
        const events = response.data.schedules;        
        return events;
    })
    .catch(error => {
        console.log('Error retrieving MLB Events:' + error);
    });
}
const fetchSoccerPlayerProps = async (event) => {
    return axios.get(`${ODDS_API_BASEURL}/${LOCALE}/sport_events/${event}/players_props.json?api_key=${apiOddsKey}`)
  .then(response => {
    const markets = response.data.sport_event_players_props.players_markets.markets;

    return markets;
  })
  .catch(error => {
    console.log('Error retrieving NBA schedule:' + error);
  });
}
module.exports = {
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
};

