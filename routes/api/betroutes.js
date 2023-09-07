const express = require('express');
const router = express.Router();
const betController = require('../../controllers/betController');
const playerController = require('../../controllers/playerController');
const contestController = require('../../controllers/contestController');
const teamController = require('../../controllers/teamController');
const auth = require('../../middleware/auth');
// Betting routes


router.post('/getPlayers', playerController.getPlayersByProps);
router.post('/start', auth, betController.startBetting);





// Contest routes
router.post('/contest/fetchAll', auth, contestController.addNBAContestsToDatabase);
router.post('/contest/updateContest', contestController.updateBetfromContest);

// Team routes
router.post('/team/fetchAll', auth, teamController.addNBATeamsToDatabase);


// Player routes
router.post('/player/fetchAll', auth, playerController.addNBAPlayersToDatabase);
router.post('/player/update', auth, playerController.updateNBAPlayers);


module.exports = router;
