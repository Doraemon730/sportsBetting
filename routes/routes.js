const express = require('express');
const router = express.Router();
const betController = require('../controllers/betController');
const playerController = require('../controllers/playerController');
const contestController = require('../controllers/contestController');
const teamController = require('../controllers/teamController');
const userController = require('../controllers/userController');
const transactionController = require('../controllers/transactionController');
const auth = require('../middleware/auth');
const { checkRegister, checkLogin, checkUpdate } = require('../middleware/checkObject');

//User routes
router.post(
    '/users/register',
    checkRegister,
    userController.registerUser);

router.get(
    '/users/getUserDetail',
    auth,
    userController.getUserDetail);

router.get(
    '/users/getAllUsers',
    auth,
    userController.getAllUsers);

router.post('/users/login',
    checkLogin,
    userController.loginUser);

router.post('/users/update',
    auth,
    checkUpdate,
    userController.updateUser);

// Betting routes
router.post(
    '/bet/getPlayers',
    //   [
    //     // Input validation using express-validator
    //     body('prop').notEmpty().isString(),
    //     body('value').notEmpty().isString()
    //   ],
    playerController.getPlayersByProps
);

router.post('/bet/getPlayers', playerController.getPlayersByProps);

router.post('/bet/start',
    auth,
    betController.startBetting
);

// Transactions routes
router.post(
    '/transaction/deposit',
    auth,
    transactionController.depositBalance
);
router.post(
    '/transaction/withdraw',
    auth,
    transactionController.withdrawBalance
);

// Contest routes
router.post(
    '/contest/fetchAll',
    auth,
    contestController.addNBAContestsToDatabase
);

router.post('/contest/updateContest', contestController.updateBetfromContest);

// Team routes
router.post('/team/fetchAll', auth, teamController.addNBATeamsToDatabase);

// Player routes
router.post('/player/fetchAll', auth, playerController.addNBAPlayersToDatabase);

router.post('/player/update', auth, playerController.updateNBAPlayers);

module.exports = router;