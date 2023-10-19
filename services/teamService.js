const {
  ObjectId
} = require('mongodb');
require('../utils/log');
const axios = require('axios');
const apiNBAKey = process.env.NBA_API_KEY;
const apiNFLKey = process.env.NFL_API_KEY;
const apiNHLKey = process.env.NHL_API_KEY;
const apiMLBKey = process.env.MLB_API_KEY;
const apiCFBKey = process.env.NCAA_API_KEY;
const {
  NBA_API_BASEURL,
  LOCALE,
  NFL_API_BASEURL,
  NHL_API_BASEURL,
  MLB_API_BASEURL,
  CFB_API_BASEURL
} = require('../config/constant');

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
    }).catch(error => {
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
      throw new Error('Error retrieving NHL schedule:', error);
    });
}

const fetchNFLTeamsFromRemoteId = async (remoteId) => {

  return axios.get(`${NFL_API_BASEURL}/${LOCALE}/teams/${remoteId}/profile.json?api_key=${apiNFLKey}`)
    .then(response => {
      const team = response.data;
      return team;
    }).catch(error => {
      throw new Error('Error retrieving NFL TeamProfile:', error);
    })
}

// NHL
const fetchNHLTeams = async () => {

  return axios.get(`${NHL_API_BASEURL}/${LOCALE}/league/hierarchy.json?api_key=${apiNHLKey}`)
    .then(response => {
      const conferences = response.data.conferences;
      //console.log(conferences);
      return conferences;
    })
    .catch(error => {
      throw new Error('Error retrieving NBA schedule:', error);
    });
}
const fetchNHLTeamsFromRemoteId = async (remoteId) => {

  return axios.get(`${NHL_API_BASEURL}/${LOCALE}/teams/${remoteId}/profile.json?api_key=${apiNHLKey}`)
    .then(response => {
      const team = response.data;
      return team;
    }).catch(error => {
      throw new Error('Error retrieving NFL TeamProfile:', error);
    })
}

// MLB
const fetchMLBTeams = async () => {

  return axios.get(`${MLB_API_BASEURL}/${LOCALE}/league/hierarchy.json?api_key=${apiMLBKey}`)
    .then(response => {
      const conferences = response.data.leagues;
      //console.log(conferences);
      return conferences;
    })
    .catch(error => {
      throw new Error('Error retrieving MLB schedule:', error);
    });
}
const fetchMLBTeamsFromRemoteId = async (remoteId) => {

  return axios.get(`${MLB_API_BASEURL}/${LOCALE}/teams/${remoteId}/profile.json?api_key=${apiMLBKey}`)
    .then(response => {
      const team = response.data;
      return team;
    }).catch(error => {
      throw new Error('Error retrieving NFL TeamProfile:', error);
    })
}


// CFB
const fetchCFBTeams = async () => {

  return axios.get(`${NHL_API_BASEURL}/${LOCALE}/league/hierarchy.json?api_key=${apiNHLKey}`)
    .then(response => {
      const conferences = response.data.conferences;
      //console.log(conferences);
      return conferences;
    })
    .catch(error => {
      console.log(error);
    });
}
const fetchCFBTeamsFromRemoteId = async (remoteId) => {
  console.log(`${CFB_API_BASEURL}/${LOCALE}/teams/${remoteId}/full_roster.json?api_key=${apiCFBKey}`);

  return axios.get(`${CFB_API_BASEURL}/${LOCALE}/teams/${remoteId}/full_roster.json?api_key=${apiCFBKey}`)
    .then(response => {
      const team = response.data;
      return team;
    }).catch(error => {
      console.log(error);
      
    })
}

module.exports = {
  fetchNBATeamsFromRemoteId,
  fetchNBATeams,
  fetchNFLTeams,
  fetchNFLTeamsFromRemoteId,
  fetchNHLTeams,
  fetchNHLTeamsFromRemoteId,
  fetchMLBTeams,
  fetchMLBTeamsFromRemoteId,
  fetchCFBTeamsFromRemoteId
};