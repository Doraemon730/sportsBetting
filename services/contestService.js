const Contest = require('../models/Contest');
const Team = require('../models/Team');
const teamService = require('./teamService');
const {ObjectId} = require('mongodb');
const axios = require('axios');

const fetchNBAContest = async (season) => {
    const apiKey = process.env.NBA_API_KEY;
    const baseUrl = process.env.NBA_API_BASEURL;
    const locale = process.env.NBA_API_LOCALE;    
    console.log(baseUrl, locale, season, apiKey);
    return axios.get(`${baseUrl}/${locale}/games/${season}/schedule.json?api_key=${apiKey}`)
    .then(response => {
      const schedule = response.data.games;
      return schedule;
    })
    .catch(error => {
      throw new Error('Error retrieving NBA schedule:', error);
    });
}

const addNBAContestsToDatabase = async () => {
    try {
      // Fetch contest data from the Sportradar NBA API
      
      const contestData = await fetchNBAContest("2023/REG");
        
      //console.log(contestData);
      // Loop through the fetched data and add contests to the database
      for (const contestInfo of contestData) {
        const homeID = await teamService.getIdfromRemoteId(contestInfo.home.id);
        const awayID = await teamService.getIdfromRemoteId(contestInfo.away.id);

        console.log(homeID, awayID);
         const contest = new Contest({
           name: contestInfo.home.alias + " vs " + contestInfo.away.alias,
           season: "2023/REG",
           startTime: new Date(contestInfo.scheduled),          
           sportId: new ObjectId("64f78bc5d0686ac7cf1a6855"),
           remoteId: contestInfo.id,
           teams: [homeID, awayID]
         });  
         await contest.save();
       }      
      console.log('NBA contests added to the database.');
    } catch (error) {
      throw new Error(`Error adding NBA contests to the database: ${error.message}`);
    }
  };
  
  module.exports = { addNBAContestsToDatabase };