const {
  getAllTeamsFromDatabase,
  fetchNBATeamsFromRemoteId
} = require('./teamService');
const {
  ObjectId
} = require('mongodb');
const axios = require('axios');
const Fs = require('fs');
const Path = require('path');
require('../utils/log');
const apiKey = process.env.NBA_API_KEY;
const apiNFLKey = process.env.NFL_API_KEY;
const apiMLBKey = process.env.MLB_API_KEY;
const apiImageKey = process.env.NFL_HEAD_KEY;
const apiSoccerKey = process.env.SOCCER_API_KEY;
const {
  NBA_API_BASEURL,
  LOCALE,
  NFL_API_BASEURL,
  NFL_IMAGE_BASEURL,
  NFL_IMAGE_PROVIDER,
  NFL_IMAGE_TYPE,
  YEAR,
  SOCCER_API_BASEURL,
  MLB_API_BASEURL
} = require('../config/constant');


const fetchPlayerProfile = async (playerId) => {

  return axios.get(`${NBA_API_BASEURL}/${LOCALE}/players/${playerId}/profile.json?api_key=${apiKey}`)
    .then(response => {
      if (response.data.seasons.length > 0) {
        const team_review = response.data.seasons[0].teams[0];
        return team_review;
      } else {
        return null;
      }
    })
    .catch(error => {
      console.log(error);
      //throw new Error('Error retrieving player Info:', error);
    });
}
const fetchNFLPlayerProfile = async (playerId) => {

  return axios.get(`${NFL_API_BASEURL}/${LOCALE}/players/${playerId}/profile.json?api_key=${apiNFLKey}`)
    .then(response => {
      if (response.data.seasons.length > 0) {
        const team_review = response.data.seasons[0].teams[0];
        return team_review;
      } else {
        return null;
      }
    })
    .catch(error => {
      console.log(error);
      //throw new Error('Error retrieving player Info:', error);
    });
}

const fetchSoccerPlayerProfile = async (srId) => {
  return axios.get(`${SOCCER_API_BASEURL}/${LOCALE}/players/${srId}/profile.json?api_key=${apiSoccerKey}`)
    .then(response => {
      
        const player = response.data;
        return player;
     
    })
    .catch(error => {
      console.log(error);
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
      console.log(error);
      //throw new Error('Error retrieving player Info:', error);
    });
}

const fetchMLBPlayerNumber = async (playerId) => {

  return axios.get(`${MLB_API_BASEURL}/${LOCALE}/players/${playerId}/profile.json?api_key=${apiMLBKey}`)
    .then(response => {
      //console.log(JSON.stringify(response.data.player));
      if (!response.data.player.jersey_number)
        return null;
      return response.data.player.jersey_number;
    })
    .catch(error => {
      console.log(error);
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
      console.log(error);
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
  //   console.log(error);
  //   //throw new Error('Error retrieving player Info:', error);
  // });
}

const fetchImageFromPrize = async (fileName) => {
  const url = `https://static.prizepicks.com/images/players/nba/${fileName}.webp`
  const path = Path.resolve(__dirname, '../public/images', fileName + '.webp')
  const writer = Fs.createWriteStream(path)

  const response = await axios({
    url,
    method: 'GET',
    headers: {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/117.0.0.0 Safari/537.36',
              'Accept' : 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7'},
    responseType: 'stream'
})

  response.data.pipe(writer)

  return new Promise((resolve, reject) => {
    writer.on('finish', resolve)
    writer.on('error', reject)
  })
}



module.exports = {
  fetchPlayerNumber,
  fetchPlayerProfile,
  fetchNFLPlayerProfile,
  fetchPlayerManifest,
  fetchPlayerImage,
  fetchSoccerPlayerProfile,
  fetchMLBPlayerNumber,
  fetchImageFromPrize
};