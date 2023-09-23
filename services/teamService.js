
const {ObjectId} = require('mongodb');
const axios = require('axios');
const apiNBAKey = process.env.NBA_API_KEY;
const apiNFLKey = process.env.NFL_API_KEY;
const { NBA_API_BASEURL, LOCALE, NFL_API_BASEURL} = require('../config/constant');

// NBA
const fetchNBATeams = async () => {
    
    return axios.get(`${NBA_API_BASEURL}/${LOCALE}/league/hierarchy.json?api_key=${apiNBAKey}`)
    .then(response => {
      const conferences = response.data.conferences;

      return conferences;
    })
    .catch(error => {
      throw new Error('Error retrieving NBA schedule:', error);
    });
}
const fetchNBATeamsFromRemoteId = async (remoteId) => {
    
    return axios.get(`${NBA_API_BASEURL}/${LOCALE}/teams/${remoteId}/profile.json?api_key=${apiNBAKey}`)
   .then(response => {
        const team = response.data;
        return team;
    }).catch(error=> {
        throw new Error('Error retrieving NBA TeamProfile:', error);
    })
}

// NFL
const fetchNFLTeams = async () => {
    
  return axios.get(`${NFL_API_BASEURL}/${LOCALE}/league/hierarchy.json?api_key=${apiNFLKey}`)
  .then(response => {
    const conferences = response.data.conferences;
    //console.log(conferences);
    return conferences;
  })
  .catch(error => {
    throw new Error('Error retrieving NBA schedule:', error);
  });
}
const fetchNFLTeamsFromRemoteId = async (remoteId) => {
    
  return axios.get(`${NFL_API_BASEURL}/${LOCALE}/teams/${remoteId}/profile.json?api_key=${apiNFLKey}`)
 .then(response => {
      const team = response.data;
      return team;
  }).catch(error=> {
      throw new Error('Error retrieving NFL TeamProfile:', error);
  })
}
  
  module.exports = { fetchNBATeamsFromRemoteId, fetchNBATeams, fetchNFLTeams, fetchNFLTeamsFromRemoteId};