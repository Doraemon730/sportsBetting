const express = require('express');
const router = express.Router();
const betController = require('../../controllers/betController');
const playerController = require('../../controllers/playerController');
const contestService = require('../../services/contestService');
const teamService = require('../../services/teamService');
const playerService = require('../../services/playerService');
// Betting routes
router.post('/bets/:id', betController.placeBetById);
router.get('/bets/:id', betController.getBetById);

// Player routes
//router.get('/player/:id', playerController.getPlayerById);

// Route to add NBA contests to the database
router.get('/addContests', async(req, res) => {
    try {
        await contestService.addNBAContestsToDatabase();
        res.json({ message: 'NBA contests added to the database.' });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
});
router.get('/addTeams', async(req, res) => {
    try {
        await teamService.addNBATeamsToDatabase();
        res.json({ message: 'NBA Teams added to the database.' });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
});
router.get('/addPlayers', async(req, res) => {
    try {
        await playerService.addNBAPlayersToDatabase();
        res.json({ message: 'NBA Players added to the database.' });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
});

module.exports = router;
