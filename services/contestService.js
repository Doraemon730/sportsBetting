const Contest = require('../models/Contest');
const Team = require('../models/Team');
const teamService = require('./teamService');
const { ObjectId } = require('mongodb');
const axios = require('axios');
const apiKey = process.env.NBA_API_KEY;
const baseUrl = process.env.NBA_API_BASEURL;
const locale = process.env.NBA_API_LOCALE;

const fetchNBAContest = async (season) => {

  return axios.get(`${baseUrl}/${locale}/games/${season}/schedule.json?api_key=${apiKey}`)
    .then(response => {
      const schedule = response.data.games;
      return schedule;
    })
    .catch(error => {
      throw new Error('Error retrieving NBA schedule:', error);
    });
}
const fetchGameSummary = async (gameId) => {
  return axios.get(`${baseUrl}/${locale}/games/${gameId}/summary.json?api_key=${apiKey}`)
    .then(response => {
      const summary = response.data;

      return summary;
    })
    .catch(error => {
      throw new Error('Error retrieving game summary');
    });
}

const FinalizeBet = async () => {
  try {
    const gameId = "fad728ad-79a1-475d-bfdc-ca9bf32db526";
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