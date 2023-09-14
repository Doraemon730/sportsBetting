const Contest = require('../models/Contest');
const Team = require('../models/Team');
const teamService = require('./teamService');
const { ObjectId } = require('mongodb');
const axios = require('axios');
const apiKey = process.env.NBA_API_KEY;
const { NBA_API_BASEURL, LOCALE } = require('../config/constant');


const fetchNBAContest = async (season) => {

  return axios.get(`${NBA_API_BASEURL}/${LOCALE}/games/${season}/schedule.json?api_key=${apiKey}`)
    .then(response => {
      const schedule = response.data.games;
      return schedule;
    })
    .catch(error => {
      throw new Error('Error retrieving NBA schedule:', error);
    });
}
const fetchGameSummary = async (gameId) => {
  return axios.get(`${NBA_API_BASEURL}/${LOCALE}/games/${gameId}/summary.json?api_key=${apiKey}`)
    .then(response => {
      const summary = response.data;

      return summary;
    })
    .catch(error => {
      throw new Error('Error retrieving game summary');
    });
}

const FinalizeBet = async (gameId) => {
  try {
    //const gameId = "fad728ad-79a1-475d-bfdc-ca9bf32db526";
    const summary = await fetchGameSummary(gameId);
    return summary;
  } catch (error) {
    console.log(error);
  }
}



module.exports = {
  fetchNBAContest, fetchGameSummary,
  FinalizeBet
};