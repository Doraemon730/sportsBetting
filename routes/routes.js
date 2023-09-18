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
const sportsController = require('../controllers/sportsController');
const referralController = require('../controllers/referralController');
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
    '/admin/users/getAllUsers',
    admin,
    userController.getUsers);

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
router.post('/bet/getPlayersBySports',
    //   [
    //     // Input validation using express-validator
    //     body('prop').notEmpty().isString(),
    //     body('value').notEmpty().isString()
    //   ],
    playerController.getTopPlayerBySport
);

router.post('/bet/getAllSports',
    //   [
    //     // Input validation using express-validator
    //     body('prop').notEmpty().isString(),
    //     body('value').notEmpty().isString()
    //   ],
    sportsController.getAllSports
);

router.post('/bet/start',
    auth,
    betController.startBetting
);

router.post('/bet/sixLegParlay',
    auth,
    checkWednesday,
    betController.sixLegParlayBetting);

router.post('/bet/firstSixLegParlay',
    auth,
    betController.firstSixLegParlayBetting);

router.post('/admin/bet/getAllBets',
    admin,
    betController.getAllBets);

router.post('/bet/getAllBetsByUserId',
    auth,
    betController.getAllBetsByUserId);

router.post('/bet/cancel',
	auth,
	betController.cancelBet);

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
);

router.post(
    '/admin/transaction/getAllTransactions',
    admin,
    transactionController.getAllTransactions
);

// Contest routes
router.post(
    '/contest/fetchAllNBAContest',
    admin,
    contestController.addNBAContestsToDatabase
);

router.post('/contest/updateContest',
    admin,
    contestController.updateBetfromContest);

// Team routes
router.post('/team/fetchAllNBATeams',
    admin,
    teamController.addNBATeamsToDatabase);

// Player routes
router.post('/player/fetchAllNBAPlayers',
    admin,
    playerController.addNBAPlayersToDatabase);

router.post('/player/updateNBAPlayer',
    admin,
    playerController.updateNBAPlayers);

router.post('/player/props',
    auth,
    playerController.getPlayerProp);

router.post('/admin/player/setDiscount',
    admin,
    discountController.setDiscount);

// Promotion routes
router.post('/admin/promotion/add',
    admin,
    promotionController.addPromotion);

router.post('/admin/promotion/fetchAll',
    admin,
    promotionController.getPromotions);

router.post('/admin/promotion/update',
    admin,
    promotionController.updatePromotion);

// Props routes
router.post('/admin/props/add',
    admin,
    propController.addProp);
router.post('/admin/props/fetchAll',
    admin,
    propController.getProps);

router.post('/admin/revenue',
    admin,
    capitalController.getCaptital);

// Statistics routes
router.post('/admin/statistics',
    admin,
    statisticsController.getStatistics);

router.post('/admin/statistics/getTotalBet',
    admin,
    statisticsController.getTotalUserWithBet);

router.post('/admin/statistics/getDailyBet',
    admin,
    statisticsController.getUserBetStats);

// Referral routes
router.post('/admin/referral/setReferralLevel',
    admin,
    referralController.setReferralLevel);

router.post('/admin/referral/getAllReferrals',
    admin,
    referralController.getAllReferrals)


router.post('/transaction/payment', auth, transactionController.makePayment);
module.exports = router;