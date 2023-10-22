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
const eventController = require('../controllers/eventController');
const configureController = require('../controllers/configureController');
const bonusController = require('../controllers/bonusController');
const auth = require('../middleware/auth');
const admin = require('../middleware/admin');
const { checkRegister, checkLogin, checkUpdate, checkResetPassword, checkEmail } = require('../middleware/checkObject');
const { checkWednesday } = require('../middleware/checkDay');
const checkWithdraw = require('../middleware/checkWithdraw');
//User routes
router.post(
    '/users/register',
    checkRegister,
    userController.registerUser);

router.post(
    '/users/getUserDetail',
    auth,
    userController.getUserDetail);

router.post(
    '/admin/users/addBalanceAndCredits',
    admin,
    userController.addBalanceAndCredits);

router.post(
    '/admin/users/getAllUsers',
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

router.post('/users/getReferralBonus',
    auth,
    bonusController.getReferralBonusByReferralId
)

router.post('/users/claimRewards',
    auth,
    userController.claimRewards
)

// Betting routes
router.post('/bet/getPlayersBySports',
    //   [
    //     // Input validation using express-validator
    //     body('prop').notEmpty().isString(),
    //     body('value').notEmpty().isString()
    //   ],
    playerController.getTopPlayerBy
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

router.post('/bet/startWedFreeBetting',
    auth,
    checkWednesday,
    betController.startWednesdayFreeBetting);

router.post('/bet/startFirstFreeBetting',
    auth,
    betController.startFirstFreeBetting);

router.post('/admin/bet/getAllBets',
    admin,
    betController.getAllBets);

router.post('/admin/bet/getAllBetsByUserId',
    admin,
    betController.getAllBetsByUserIdAdmin);

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
    checkWithdraw,
    transactionController.withdrawBalance
);

router.post(
    '/transaction/getEtherPrice',
    transactionController.getETHPrice
);

router.post(
    '/admin/transaction/getAllTransactions',
    admin,
    transactionController.getAllTransactions
);

router.post(
    '/transaction/getTransactionsByUserId',
    auth,
    transactionController.getTransactionsByUserId
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
    //admin,
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


router.post('/admin/statistics/getRevenue',
    admin,
    transactionController.getRevenue);

router.post('/admin/statistics/getTotalBet',
    admin,
    statisticsController.getTotalUserWithBet);

router.post('/admin/statistics/getDailyBet',
    admin,
    statisticsController.getUserBetStats);

// Referral routes
router.post('/admin/referral/setReferral',
    admin,
    referralController.setReferral);

router.post('/admin/referral/getAllReferrals',
    admin,
    referralController.getAllReferrals)

router.post('/admin/configure/setBetAmountLimit',
    admin,
    configureController.setBetAmountLimit);

router.post('/configure/getBetAmountLimit',
    configureController.getBetAmountLimit);

router.post('/user/getbalance', auth, userController.getWalletBalance);

router.post('/test/changeEventState', admin, eventController.changeEventState);
router.post('/admin/giveRewards', admin, betController.giveRewards);

router.post('/admin/getTotalBalance', admin, userController.getTotalBalance);

router.post('/admin/getNFLTeams', teamController.addNFLTeamsToDatabase);
router.post('/admin/getNFLContest', contestController.addNFLContestsToDatabase);
router.post('/admin/getNFLPlayers', playerController.addNFLPlayersToDatabase);
router.post('/admin/getWeeklyEvents', eventController.getWeekEventAll);
router.post('/admin/getWeeklyScheduleNFL', eventController.getWeeklyEventsNFL);
router.post('/admin/getWeeklyScheduleMLB', eventController.getWeeklyEventsMLB);
router.post('/admin/getWeeklyScheduleNHL', eventController.getWeeklyEventsNHL);
router.post('/admin/player', playerController.getPlayerManifest);
router.post('/admin/addSport', sportsController.addSport);
router.post('/admin/getNHLTeams', teamController.addNHLTeamsToDatabase);
router.post('/admin/getNHLPlayers', playerController.addNHLPlayersToDatabase);
router.post('/admin/getMLBTeams', teamController.addMLBTeamsToDatabase);
router.post('/admin/removeNHLTeams', teamController.remove);
router.post('/admin/getMLBPlayers', playerController.addMLBPlayersToDatabase);
router.post('/admin/remoevNHLPlayers', playerController.remove);
router.post('/admin/removeWeekSchedueMLB', eventController.remove);
router.post('/admin/getWeeklyScheduleSoccer', eventController.getWeeklyEventsSoccer);
router.post('/admin/resetOdds', playerController.resetOdds);
router.post('/admin/updateMLB', playerController.updateMLBPlayers);
router.post('/admin/testBet', eventController.testBet);
router.post('/admin/addSoccerTeam', teamController.addSoccerTeam);
router.post('/admin/addSoccerPlayer', playerController.addSoccerPlayer);
router.post('/admin/bet/updateEvents', betController.udpateEventsByBet);
router.post('/admin/test', eventController.test);

router.post('/admin/addCFBTeam', teamController.addCFBTeamToDatabase);
router.post('/admin/getCFBPlayers', playerController.addCFBPlayersToDatabase);
router.post('/admin/getWeeklyScheduleCFB', eventController.getWeeklyEventsCFB);
router.post('/admin/testlive', eventController.testlive);
router.post('/admin/updateSoccerPlayers', playerController.updateSoccerPlayers);
module.exports = router;