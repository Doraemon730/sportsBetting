
const { getAllTeamsFromDatabase, fetchNBATeamsFromRemoteId } = require('./teamService');
const { ObjectId } = require('mongodb');
const axios = require('axios');
const Fs = require('fs');
const Path = require('path');
const apiKey = process.env.NBA_API_KEY;
const apiNFLKey = process.env.NFL_API_KEY;
const apiImageKey = process.env.NFL_HEAD_KEY;
const { 
  NBA_API_BASEURL, 
  LOCALE, 
  NFL_API_BASEURL,
  NFL_IMAGE_BASEURL,
  NFL_IMAGE_PROVIDER,
  NFL_IMAGE_TYPE,
  YEAR
 } = require('../config/constant');


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

const fetchPlayerManifest = async () => {
  return axios.get(`${NFL_IMAGE_BASEURL}/${NFL_IMAGE_PROVIDER}/${NFL_IMAGE_TYPE}/players/${YEAR}/manifest.json?api_key=${apiImageKey}`)
    .then(response => {
     //console.log(response.data);
     return response.data;
    })
    .catch(error => {
      console.log(error.message);
      //throw new Error('Error retrieving player Info:', error);
  });
}
const fetchPlayerImage = async (asset_id, fileName) => {
  const url = `${NFL_IMAGE_BASEURL}/${NFL_IMAGE_PROVIDER}/${NFL_IMAGE_TYPE}/players/${asset_id}/180x180-crop.png?api_key=${apiImageKey}`
  const path = Path.resolve(__dirname, '../public/images', fileName + '.png')
  const writer = Fs.createWriteStream(path)

  const response = await axios({
    url,
    method: 'GET',
    responseType: 'stream'
  })

  response.data.pipe(writer)

  return new Promise((resolve, reject) => {
    writer.on('finish', resolve)
    writer.on('error', reject)
  })
  // return axios.get(`${NFL_IMAGE_BASEURL}/${NFL_IMAGE_PROVIDER}/${NFL_IMAGE_TYPE}/players/${asset_id}/180x180-crop.png?api_key=${apiImageKey}`)
  //   .then(response => {   

  //   console.log(response);
  //  return response.data;
  // })
  // .catch(error => {
  //   console.log(error.message);
  //   //throw new Error('Error retrieving player Info:', error);
  // });
}




module.exports = { fetchPlayerNumber, fetchPlayerProfile, fetchNFLPlayerProfile, fetchPlayerManifest, fetchPlayerImage};