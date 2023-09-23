const { ObjectId } = require('mongodb');
const axios = require('axios');

const apiOddsKey = process.env.ODDS_API_KEY;
const { ODDS_API_BASEURL,    
    LOCALE,
    NFL_COMPETITION_ID } = require('../config/constant')

const fetchWeeklyEvents = async () => {
    return axios.get(`${ODDS_API_BASEURL}/${LOCALE}/competitions/${NFL_COMPETITION_ID}/schedules.json?api_key=${apiOddsKey}&offset=0&limit=16&start=0`)
  .then(response => {
    const events = response.data.schedules;
    
    return events;
  })
  .catch(error => {
    console.log('Error retrieving NFL Events:' + error);
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
    fetchWeeklyEvents,
    fetchEventPlayerProps
};

