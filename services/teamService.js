const Team = require('../models/Team');
const {ObjectId} = require('mongodb');
const axios = require('axios');

const fetchNBATeams = async () => {
    const apiKey = process.env.NBA_API_KEY;
    const baseUrl = process.env.NBA_API_BASEURL;
    const locale = process.env.NBA_API_LOCALE;    
    
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
    const apiKey = process.env.NBA_API_KEY;
    const baseUrl = process.env.NBA_API_BASEURL;
    const locale = process.env.NBA_API_LOCALE;    
    
    return axios.get(`${baseUrl}/${locale}/teams/${remoteId}/profile.json?api_key=${apiKey}`)
   .then(response => {
        const team = response.data;
        return team;
    }).catch(error=> {
        throw new Error('Error retrieving NBA TeamProfile:', error);
    })
}
const getIdfromRemoteId = async (remoteId) => {
    try {
        console.log(remoteId);
        const team = await Team.findOne({remoteId: remoteId});
        console.log(team);
        return team._id;
    } catch (error) {
        throw new Error(`Error retrieving Get ID: ${error.message}`);
    }
}
const getAllTeamsFromDatabase = async () => {
    const teams = await Team.find({});
    return teams;
}
const addNBATeamsToDatabase = async () => {
    try {
      // Fetch contest data from the Sportradar NBA API
      
      const conferences = await fetchNBATeams();
        
      console.log(conferences);
      // Loop through the fetched data and add contests to the database
      for (const conference of conferences) {
        for(const divisionInfo of conference.divisions){
            for( const teamInfo of divisionInfo.teams){
                
                const team = new Team({
                    name: teamInfo.name,
                    sportId: new ObjectId("64f78bc5d0686ac7cf1a6855"),
                    remoteId: teamInfo.id                    
                });
                await team.save();            
            }
        }       
        
       }
      
      console.log('NBA Teams added to the database.');
    } catch (error) {
      throw new Error(`Error adding NBA contests to the database: ${error.message}`);
    }
  };
  
  module.exports = { addNBATeamsToDatabase, getIdfromRemoteId, getAllTeamsFromDatabase, fetchNBATeamsFromRemoteId};