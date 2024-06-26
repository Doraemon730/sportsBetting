const Team = require('../models/Team');
const {
    fetchNBATeams,
    fetchNFLTeams,
    fetchNHLTeams,
    fetchMLBTeams,
    fetchNBATeamsFromGoal,
    fetchNFLTeamsFromGoal,
    fetchNHLTeamsFromGoal,
    fetchFBSTeamsFromGoal
} = require('../services/teamService');
require('../utils/log');
const {
    ObjectId
} = require('mongodb');
const { confirmArray } = require('../utils/util');

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
                        remoteId: teamInfo.id,
                        alias: teamInfo.alias,
                        srId: teamInfo.sr_id
                    });
                    await team.save();
                }
            }
        }
        res.json({
            message: 'NBA Teams added to the database.'
        });
    } catch (error) {
        console.log(error);
        res.status(500).send(`Error adding NBA contests to the database: ${error.message}`);
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
        throw new Error(`Error adding NFL contests to the database: ${error.message}`);
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


const addCFBTeamToDatabase = async (req, res) => {
    try{
        const { name, remoteId, alias, market } = req.body;

        const team = new Team({
            name,
            sportId: new ObjectId("652f31fdfb0c776ae3db47e1"),
            remoteId,
            alias,
            market
        });
        await team.save();
        res.json(team);
    } catch (error) {
        console.log(error);
        res.status(500).send(`Error adding CFB contests to the database: ${error.message}`);
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

const getTeamListBySport = async (req, res) => {
    try {
        let {sportId} = req.body;        
        const teams = await Team.find({sportId: new ObjectId(sportId)}).select('alias name');
        res.json(teams);
    } catch(error) {
        console.log(error);
        res.status(500).send("Error");
    }
}

const updateNBATeamsFromGoal = async (req, res) => {
    try {
        let teams = [];        
        const leagues = await fetchNBATeamsFromGoal();
        for(let league of leagues) {
            //console.log(JSON.stringify(division));
            for(let division of league.division)
                for(let team of division.team) {
                    teams.push(team);
                }
        }

        let NBATeams = await Team.find({sportId: new ObjectId('64f78bc5d0686ac7cf1a6855')});
        for(let nbaTeam of NBATeams) {
            let team = teams.find((t) => t.name.includes(nbaTeam.name));
            console.log(nbaTeam.name + ":" + team.name);
            nbaTeam.name = team.name;
            nbaTeam.gId = team.id;
            await nbaTeam.save();
        }
        res.json(NBATeams);
    } catch(error) {
        console.log(error);
        res.status(500).send(Error);
    }
}
const updateNFLTeamsFromGoal = async (req, res) => {
    try {
        let teams = [];        
        const leagues = await fetchNFLTeamsFromGoal();
        for(let league of leagues) {
            //console.log(JSON.stringify(division));
            for(let division of league.division)
                for(let team of division.team) {
                    teams.push(team);
                }
        }

        let NFLTeams = await Team.find({sportId: new ObjectId('650e0b6fb80ab879d1c142c8')});
        for(let nflTeam of NFLTeams) {
            let team = teams.find((t) => t.name.includes(nflTeam.name));
            console.log(nflTeam.name + ":" + team.name);
            nflTeam.name = team.name;
            nflTeam.gId = team.id;
            await nflTeam.save();
        }
        res.json(NFLTeams);
        console.log(NFLTeams);
    } catch(error) {
        console.log(error);
        res.status(500).send(Error);
    }
}

const updateNHLTeamsFromGoal = async (req, res) => {
    try {
        let teams = [];        
        const leagues = await fetchNHLTeamsFromGoal();
        for(let league of leagues) {
            //console.log(JSON.stringify(division));
            for(let division of league.division)
                for(let team of division.team) {
                    teams.push(team);
                }
        }

        let nhlTeams = await Team.find({sportId: new ObjectId('65108faf4fa2698548371fbd')});
        for(let nhlTeam of nhlTeams) {
            let team = teams.find((t) => t.name.includes(nhlTeam.name));
            console.log(nhlTeam.name + ":" + team.name);
            nhlTeam.name = team.name;
            nhlTeam.gId = team.id;
            await nhlTeam.save();
        }
        res.json(nhlTeams);
        console.log(nhlTeams);
    } catch(error) {
        console.log(error);
        res.status(500).send(Error);
    }
}

const updateFBSTeamsFromGoal = async (req, res) => {
    try {        
        const leagues = await fetchFBSTeamsFromGoal();
        for(let league of leagues) {
            //console.log(JSON.stringify(division));
            let divisions = confirmArray(league.division);
            for(let division of divisions)
                for(let team of division.team) {
                    let fbsTeam = await Team.findOne({sportId: new ObjectId('652f31fdfb0c776ae3db47e1'), market: team.name});
                    if(fbsTeam) {
                        fbsTeam.name = team.name;
                        fbsTeam.gId = team.id;
                        await fbsTeam.save();
                    } 
                }
        }

        
    } catch(error) {
        console.log(error);        
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
    addSoccerTeam,
    addCFBTeamToDatabase,
    getTeamListBySport,
    updateNBATeamsFromGoal,
    updateNFLTeamsFromGoal,
    updateNHLTeamsFromGoal,
    updateFBSTeamsFromGoal
}