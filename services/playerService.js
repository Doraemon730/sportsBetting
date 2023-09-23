
const { getAllTeamsFromDatabase, fetchNBATeamsFromRemoteId } = require('./teamService');
const { ObjectId } = require('mongodb');
const axios = require('axios');
const apiKey = process.env.NBA_API_KEY;
const apiNFLKey = process.env.NFL_API_KEY;
const { 
  NBA_API_BASEURL, 
  LOCALE, 
  NFL_API_BASEURL } = require('../config/constant');


const fetchPlayerProfile = async (playerId) => {

  return axios.get(`${NBA_API_BASEURL}/${LOCALE}/players/${playerId}/profile.json?api_key=${apiKey}`)
    .then(response => {
      if (response.data.seasons.length > 0) {
        const team_review = response.data.seasons[0].teams[0];
        return team_review;
      }
      else {
        return null;
      }
    })
    .catch(error => {
      console.log(error.message);
      //throw new Error('Error retrieving player Info:', error);
    });
}
const fetchNFLPlayerProfile = async (playerId) => {

  return axios.get(`${NFL_API_BASEURL}/${LOCALE}/players/${playerId}/profile.json?api_key=${apiNFLKey}`)
    .then(response => {
      if (response.data.seasons.length > 0) {
        const team_review = response.data.seasons[0].teams[0];
        return team_review;
      }
      else {
        return null;
      }
    })
    .catch(error => {
      console.log(error.message);
      //throw new Error('Error retrieving player Info:', error);
    });
}
const fetchPlayerNumber = async (playerId) => {

  return axios.get(`${NBA_API_BASEURL}/${LOCALE}/players/${playerId}/profile.json?api_key=${apiKey}`)
    .then(response => {
      if (!response.data.jersey_number)
        return null;
      return parseInt(response.data.jersey_number);
    })
    .catch(error => {
      console.log(error.message);
      //throw new Error('Error retrieving player Info:', error);
    });
}




module.exports = { fetchPlayerNumber, fetchPlayerProfile, fetchNFLPlayerProfile };