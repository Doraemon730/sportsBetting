const { ObjectId } = require('mongodb');
const axios = require('axios');

const apiOddsKey = process.env.ODDS_API_KEY;
const { ODDS_API_BASEURL,    
    LOCALE,
    NFL_COMPETITION_ID,
    MLB_COMPETITION_ID,
    NHL_COMPETITION_ID,
 } = require('../config/constant')

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
module.exports = {
    fetchWeeklyEventsNFL,
    fetchEventPlayerProps,
    fetchEventMapping,
    fetchWeeklyEventsMLB,
    fetchPlayerMapping
};

