const express = require('express');
const router = express.Router();
const betController = require('../../controllers/betController');
const playerController = require('../../controllers/playerController');
const contestController = require('../../controllers/contestController');
const teamController = require('../../controllers/teamController');
const transactionController = require('../../controllers/transactionController');
const auth = require('../../middleware/auth');
// Betting routes


router.post('/bet/getPlayers', playerController.getPlayersByProps);
router.post('/bet/start', auth, betController.startBetting);

// Transactions routes

router.post('/transaction/getTransactionDetails', auth, transactionController.depositBallance);



// Contest routes
router.post('/contest/fetchAll', auth, contestController.addNBAContestsToDatabase);
router.post('/contest/updateContest', contestController.updateBetfromContest);

// Team routes
router.post('/team/fetchAll', auth, teamController.addNBATeamsToDatabase);


// Player routes
router.post('/player/fetchAll', auth, playerController.addNBAPlayersToDatabase);
router.post('/player/update', auth, playerController.updateNBAPlayers);


module.exports = router;
