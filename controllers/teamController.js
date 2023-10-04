const Team = require('../models/Team');
const {
    fetchNBATeams,
    fetchNFLTeams,
    fetchNHLTeams,
    fetchMLBTeams
} = require('../services/teamService');
require('../utils/log');
const {
    ObjectId
} = require('mongodb');

const getIdfromRemoteId = async (remoteId) => {
    try {
        const team = await Team.findOne({
            remoteId: remoteId
        });
        return team._id;
    } catch (error) {
        console.log(error);
        throw new Error(`Error retrieving Get ID: ${error.message}`);
    }
}
const getAllTeamsFromDatabase = async (id) => {
    const teams = await Team.find({
        sportId: id
    });
    return teams;
}
const addNBATeamsToDatabase = async (req, res) => {
    try {
        // Fetch contest data from the Sportradar NBA API

        const conferences = await fetchNBATeams();

        // Loop through the fetched data and add contests to the database
        for (const conference of conferences) {
            for (const divisionInfo of conference.divisions) {
                for (const teamInfo of divisionInfo.teams) {

                    const team = new Team({
                        name: teamInfo.name,
                        sportId: new ObjectId("64f78bc5d0686ac7cf1a6855"),
                        remoteId: teamInfo.id
                    });
                    await team.save();
                }
            }
        }
        res.json({
            message: 'NBA Teams added to the database.'
        });
    } catch (error) {
        throw new Error(`Error adding NBA contests to the database: ${error.message}`);
    }
};
const addNFLTeamsToDatabase = async (req, res) => {
    try {
        const conferences = await fetchNFLTeams();

        // Loop through the fetched data and add contests to the database
        for (const conference of conferences) {
            for (const divisionInfo of conference.divisions) {
                for (const teamInfo of divisionInfo.teams) {

                    const team = new Team({
                        name: teamInfo.name,
                        sportId: new ObjectId("650e0b6fb80ab879d1c142c8"),
                        remoteId: teamInfo.id,
                        alias: teamInfo.alias,
                        srId: teamInfo.sr_id
                    });
                    await team.save();
                }
            }
        }
        res.json({
            message: 'NFL Teams added to the database.'
        });
    } catch (error) {
        throw new Error(`Error adding NBA contests to the database: ${error.message}`);
    }
}
const addNHLTeamsToDatabase = async (req, res) => {
    try {
        const conferences = await fetchNHLTeams();

        // Loop through the fetched data and add contests to the database
        for (const conference of conferences) {
            for (const divisionInfo of conference.divisions) {
                for (const teamInfo of divisionInfo.teams) {

                    const team = new Team({
                        name: teamInfo.name,
                        sportId: new ObjectId("65108faf4fa2698548371fbd"),
                        remoteId: teamInfo.id,
                        alias: teamInfo.alias,
                        srId: teamInfo.sr_id
                    });
                    await team.save();
                }
            }
        }
        res.json({
            message: 'NHL Teams added to the database.'
        });
    } catch (error) {
        //throw new Error(`Error adding NHL contests to the database: ${error.message}`);
        res.status(500).send(`Error adding NHL contests to the database: ${error.message}`);
    }
}
const addMLBTeamsToDatabase = async (req, res) => {
    try {
        const conferences = await fetchMLBTeams();

        // Loop through the fetched data and add contests to the database
        for (const conference of conferences) {
            for (const divisionInfo of conference.divisions) {
                for (const teamInfo of divisionInfo.teams) {

                    const team = new Team({
                        name: teamInfo.name,
                        sportId: new ObjectId("65108fcf4fa2698548371fc0"),
                        remoteId: teamInfo.id,
                        alias: teamInfo.abbr,
                        srId: teamInfo.sr_id
                    });
                    await team.save();
                }
            }
        }
        res.json({
            message: 'MLB Teams added to the database.'
        });
    } catch (error) {
        //throw new Error(`Error adding NHL contests to the database: ${error.message}`);
        res.status(500).send(`Error adding NHL contests to the database: ${error.message}`);
    }
}


const remove = async (req, res) => {
    await Team.deleteMany({sportId: new ObjectId("65108fcf4fa2698548371fc0")});
    res.json("Success");
  }

const addSoccerTeam = async (req, res) => {
    try{
        const {name, remoteId, alias, srId} = req.body;
        const team = new Team({
            name,
            sportId: new ObjectId('65131974db50d0c2c8bf7aa7'),
            remoteId,
            alias,
            srId
        });
        await team.save();
        res.json(team);
    } catch(error) {
        console.log(error);
        res.status(500).send("Error");
    }
}
module.exports = {
    addNBATeamsToDatabase,
    getIdfromRemoteId,
    getAllTeamsFromDatabase,
    addNFLTeamsToDatabase,
    addNHLTeamsToDatabase,
    addMLBTeamsToDatabase,
    remove,
    addSoccerTeam
}