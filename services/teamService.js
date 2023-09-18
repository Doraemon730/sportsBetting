
const {ObjectId} = require('mongodb');
const axios = require('axios');
const apiKey = process.env.NBA_API_KEY;
const { NBA_API_BASEURL, LOCALE } = require('../config/constant');

const fetchNBATeams = async () => {
    
    return axios.get(`${NBA_API_BASEURL}/${LOCALE}/league/hierarchy.json?api_key=${apiKey}`)
    .then(response => {
      const conferences = response.data.conferences;

      return conferences;
    })
    .catch(error => {
      throw new Error('Error retrieving NBA schedule:', error);
    });
}
const fetchNBATeamsFromRemoteId = async (remoteId) => {
    
    return axios.get(`${NBA_API_BASEURL}/${LOCALE}/teams/${remoteId}/profile.json?api_key=${apiKey}`)
   .then(response => {
        const team = response.data;
        return team;
    }).catch(error=> {
        throw new Error('Error retrieving NBA TeamProfile:', error);
    })
}

  
  module.exports = { fetchNBATeamsFromRemoteId, fetchNBATeams};