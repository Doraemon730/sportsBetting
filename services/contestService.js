
const teamService = require('./teamService');
const { ObjectId } = require('mongodb');
const axios = require('axios');
const apiKey = process.env.NBA_API_KEY;
const NFL_API_KEY = process.env.NFL_API_KEY;
require('../utils/log');
const { NBA_API_BASEURL, LOCALE, NFL_API_BASEURL} = require('../config/constant');


const fetchNBAContest = async (season) => {

  return axios.get(`${NBA_API_BASEURL}/${LOCALE}/games/${season}/schedule.json?api_key=${apiKey}`)
    .then(response => {
      const schedule = response.data.games;
      return schedule;
    })
    .catch(error => {
      throw new Error('Error retrieving NBA schedule:', error);
    });
};

const fetchNFLContest = async (season) => {
  return axios.get(`${NFL_API_BASEURL}/${LOCALE}/games/${season}/schedule.json?api_key=${NFL_API_KEY}`)
    .then(response => {
      const weeks = response.data.weeks;
      return weeks;
    })
    .catch(error => {
      throw new Error('Error retrieving NFL schedule', error);
    });  
};

const fetchGameSummary = async (gameId) => {
  return axios.get(`${NBA_API_BASEURL}/${LOCALE}/games/${gameId}/summary.json?api_key=${apiKey}`)
    .then(response => {
      const summary = response.data;

      return summary;
    })
    .catch(error => {
      throw new Error('Error retrieving game summary');
    });
};

const FinalizeBet = async (gameId) => {
  try {
    //const gameId = "fad728ad-79a1-475d-bfdc-ca9bf32db526";
    const summary = await fetchGameSummary(gameId);
    return summary;
  } catch (error) {
    console.log(error);
  }
};



module.exports = {
  fetchNBAContest, fetchGameSummary,
  FinalizeBet, fetchNFLContest
};