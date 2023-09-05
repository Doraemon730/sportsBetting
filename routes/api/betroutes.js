const express = require('express');
const router = express.Router();
const betController = require('../../controllers/betController');
const playerController = require('../../controllers/playerController');

// Betting routes
router.post('/bets/:id', betController.placeBetById);
router.get('/bets/:id', betController.getBetById);

// Player routes
//router.get('/player/:id', playerController.getPlayerById);
module.exports = router;
