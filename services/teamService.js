const Team = require('../models/Team');
const {ObjectId} = require('mongodb');
const axios = require('axios');
const apiKey = process.env.NBA_API_KEY;
const baseUrl = process.env.NBA_API_BASEURL;
const locale = process.env.NBA_API_LOCALE;   

const fetchNBATeams = async () => {
    
    return axios.get(`${baseUrl}/${locale}/league/hierarchy.json?api_key=${apiKey}`)
    .then(response => {
      const conferences = response.data.conferences;

      return conferences;
    })
    .catch(error => {
      throw new Error('Error retrieving NBA schedule:', error);
    });
}
const fetchNBATeamsFromRemoteId = async (remoteId) => {
    
    return axios.get(`${baseUrl}/${locale}/teams/${remoteId}/profile.json?api_key=${apiKey}`)
   .then(response => {
        const team = response.data;
        return team;
    }).catch(error=> {
        throw new Error('Error retrieving NBA TeamProfile:', error);
    })
}

  
  module.exports = { fetchNBATeamsFromRemoteId};