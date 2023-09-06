const Player = require('../models/Player');
const {getAllTeamsFromDatabase, fetchNBATeamsFromRemoteId} = require('./teamService');
const {ObjectId} = require('mongodb');
const axios = require('axios');

const fetchPlayerProfile = async (playerId) => {
    const apiKey = process.env.NBA_API_KEY;
    const baseUrl = process.env.NBA_API_BASEURL;
    const locale = process.env.NBA_API_LOCALE;    
    console.log(playerId);
    return axios.get(`${baseUrl}/${locale}/players/${playerId}/profile.json?api_key=${apiKey}`)
    .then(response => {     
     
      
      if(response.data.seasons.length > 0) {
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
const getPlayerById = async (playerId) => {
    try {
      const player = await Player.findById(playerId).populate('teamId', 'name'); // Use .populate() to populate team data
      if (!player) {
        throw new Error('Player not found');
      }
      return player;
    } catch (error) {
        console.log(error.message);
      //throw new Error(`Error getting player by ID: ${error.message}`);
    }
  };
const addNBAPlayersToDatabase = async () => {
    try {
      // Fetch contest data from the Sportradar NBA API
      
      const teams = await getAllTeamsFromDatabase();
        
      
      // Loop through the fetched data and add contests to the database
      for (const team of teams) {
        
        const remoteteam = await fetchNBATeamsFromRemoteId(team.remoteId);
        //console.log(remoteteam);
        for(const player of remoteteam.players){
            const playerProfile = await fetchPlayerProfile(player.id);
            console.log(playerProfile);
            if(playerProfile) {
                const newPlayer = new Player({
                    name: player.full_name,
                    sportId: new ObjectId("64f78bc5d0686ac7cf1a6855"),
                    remoteId: player.id,
                    teamId: team._id,
                    position: player.position,
                    statistics : playerProfile.average
                });
                await newPlayer.save();        
            }
        }  
    }
      
      console.log('NBA Players added to the database.');
    } catch (error) {
      throw new Error(`Error adding NBA contests to the database: ${error.message}`);
    }
  };

module.exports = { addNBAPlayersToDatabase};