const express = require('express');
const router = express.Router();
const betController = require('../controllers/betController');
const playerController = require('../controllers/playerController');
const contestController = require('../controllers/contestController');
const teamController = require('../controllers/teamController');
const userController = require('../controllers/userController');
const transactionController = require('../controllers/transactionController');
const promotionController = require('../controllers/promotionController');
const propController = require('../controllers/propController');
const discountController = require('../controllers/discountController');
const capitalController = require('../controllers/capitalController');
const statisticsController = require('../controllers/statisticsController');
const auth = require('../middleware/auth');
const admin = require('../middleware/admin');
const { checkRegister, checkLogin, checkUpdate, checkResetPassword, checkEmail } = require('../middleware/checkObject');
const { checkWednesday } = require('../middleware/checkDay');
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
    admin,
    userController.getAllUsers);

router.post('/users/login',
    checkLogin,
    userController.loginUser);

router.post('/users/update',
    auth,
    checkUpdate,
    userController.updateUser);

router.post('/users/sendResetPasswordEmail',
    checkEmail,
    userController.sendResetPasswordEmail);

router.post('/users/resetPassword',
    checkResetPassword,
    userController.resetPassword);

// Betting routes
router.post('/bet/getPlayers',
    //   [
    //     // Input validation using express-validator
    //     body('prop').notEmpty().isString(),
    //     body('value').notEmpty().isString()
    //   ],
    playerController.getPlayersByProps
);

router.post('/bet/start',
    auth,
    betController.startBetting
);

router.post('/bet/sixLegParlay', checkWednesday, betController.sixLegParlayBetting);

router.post('/bet/getAllBets', admin, betController.getAllBets);

router.post('/bet/getAllBetsByUserId', auth, betController.getAllBetsByUserId);

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
router.get(
    '/transaction/getEtherPrice',
    transactionController.getETHPrice
)

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
router.post('/player/props', playerController.getPlayerProp);
router.post('/player/addDiscount', discountController.addDiscount);


// Promotion routes
router.post('/promotion/add', promotionController.addPromotion);

router.post('/promotion/fetchAll', auth, promotionController.getPromotions);

router.post('/promotion/update', auth, promotionController.updatePromotion);

// Props routes
router.post('/props/add', propController.addProp);
router.post('/props/fetchAll', propController.getProps);

router.post('/capital', capitalController.addCapital);

// Statistics routes
router.post('/statistics', statisticsController.getStatistics);
//Transaction routes
module.exports = router;