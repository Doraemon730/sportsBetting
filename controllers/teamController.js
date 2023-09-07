const Team = require('../models/Team');
const {ObjectId} = require('mongodb');

const getIdfromRemoteId = async (remoteId) => {
    try {        
        const team = await Team.findOne({remoteId: remoteId});        
        return team._id;
    } catch (error) {
        throw new Error(`Error retrieving Get ID: ${error.message}`);
    }
}
const getAllTeamsFromDatabase = async () => {
    const teams = await Team.find({});
    return teams;
}
const addNBATeamsToDatabase = async (req, res) => {
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
      res.json({message:'NBA Teams added to the database.'});
    } catch (error) {
      throw new Error(`Error adding NBA contests to the database: ${error.message}`);
    }
  };

  module.exports = { addNBATeamsToDatabase, getIdfromRemoteId, getAllTeamsFromDatabase}