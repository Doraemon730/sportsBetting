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
const playStatController = require('../controllers/playStatController');
const geventController = require('../controllers/geventController');
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

router.post('/event/getCacheData',
    auth,
    eventController.getCacheData)

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

router.post('/bet/cancelWrongBets',
    admin,
    betController.cancelWrongBets);

// Transactions routes
router.post(
    '/transaction/deposit',
    auth,
    checkWithdraw,
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

router.post('/team/getTeamList',

    teamController.getTeamListBySport);

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

router.post('/player/getStats',

    playStatController.getPlayerStats
);

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
    betController.getRevenue);

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

router.post('/admin/referral/getReferralInfo',
    admin,
    referralController.getReferralInfo)

router.post('/admin/configure/setBetAmountLimit',
    admin,
    configureController.setBetAmountLimit);

router.post('/configure/getBetAmountLimit',
    configureController.getBetAmountLimit);

router.post('/user/getbalance', auth, userController.getWalletBalance);

router.post('/test/changeEventState', admin, eventController.changeEventState);
router.post('/admin/giveRewards', admin, betController.giveRewards);

router.post('/admin/getTotalBalance', userController.getTotalBalance);

router.post('/admin/getNFLTeams',  admin, teamController.addNFLTeamsToDatabase);
router.post('/admin/getNFLContest',  admin, contestController.addNFLContestsToDatabase);
router.post('/admin/getNFLPlayers',  admin, playerController.addNFLPlayersToDatabase);
router.post('/admin/getWeeklyEvents',  admin, eventController.getWeekEventAll);
router.post('/admin/getWeeklyScheduleNFL',  admin, eventController.getWeeklyEventsNFL);
router.post('/admin/getWeeklyScheduleMLB',  admin, eventController.getWeeklyEventsMLB);
router.post('/admin/getWeeklyScheduleNHL',  admin, eventController.getWeeklyEventsNHL);
router.post('/admin/player',  admin, playerController.getPlayerManifest);
router.post('/admin/addSport',  admin, sportsController.addSport);
router.post('/admin/getNHLTeams',  admin, teamController.addNHLTeamsToDatabase);
router.post('/admin/getNHLPlayers',  admin, playerController.addNHLPlayersToDatabase);
router.post('/admin/getMLBTeams',  admin, teamController.addMLBTeamsToDatabase);
router.post('/admin/removeNHLTeams',  admin, teamController.remove);
router.post('/admin/getMLBPlayers',  admin, playerController.addMLBPlayersToDatabase);
router.post('/admin/remoevNHLPlayers',  admin, playerController.remove);
router.post('/admin/removeWeekSchedueMLB',  admin, eventController.remove);
router.post('/admin/getWeeklyScheduleSoccer',  admin, eventController.getWeeklyEventsSoccer);
router.post('/admin/resetOdds',  admin, playerController.resetOdds);
router.post('/admin/updateMLB',  admin, playerController.updateMLBPlayers);
router.post('/admin/testBet',  admin, eventController.testBet);
router.post('/admin/addSoccerTeam',  admin, teamController.addSoccerTeam);
router.post('/admin/addSoccerPlayer',  admin, playerController.addSoccerPlayer);
router.post('/admin/bet/updateEvents',  admin, betController.udpateEventsByBet);
router.post('/admin/test',  admin, eventController.test);

router.post('/admin/addCFBTeam',  admin, teamController.addCFBTeamToDatabase);
router.post('/admin/getCFBPlayers',  admin, playerController.addCFBPlayersToDatabase);
router.post('/admin/getWeeklyScheduleCFB',  admin, eventController.getWeeklyEventsCFB);
router.post('/admin/testlive',  admin, eventController.testlive);
router.post('/admin/updateSoccerPlayers',  admin, playerController.updateSoccerPlayers);

router.post('/admin/getWeeklyScheduleNBA',  admin, eventController.getWeeklyEventsNBA);
router.post('/admin/fetchImage',  admin, playerController.getImage);
router.post('/admin/changeBet',  admin, betController.changeBet);
router.post('/admin/setNBAImage',  admin, playerController.setNBAImage);
router.post('/admin/updateNFLPlayers',  admin, playerController.updateNFLPlayers);
router.post('/admin/cancelBetById', admin, betController.cancelBetByBetId);
router.post('/admin/checkResult',  admin, eventController.checkResult);
router.post('/admin/setNHLImage',  admin, playerController.setNHLImage);
router.post('/test/testReferral',  admin, userController.testReferral);
router.post('/admin/nbastats',  admin, playStatController.NBAstats);
router.post('/admin/nflstats',  admin, playStatController.NFLstats);
router.post('/users/requestCode', auth, userController.requestVerify);
router.post('/users/verifyCode', auth, userController.verifyUser);

router.post('/admin/goalnbateam', teamController.updateNBATeamsFromGoal);
router.post('/admin/goalnbaplayer', playerController.updatePlayerFromGoal);
router.post('/admin/getNBAEventsG', geventController.getNBAEventsfromGoal);
router.get('/admin/getNBAEventsG', geventController.getNBAEventsfromGoal);

router.post('/admin/goalnflteam', teamController.updateNFLTeamsFromGoal);
router.post('/admin/goalnflplayer', playerController.updateNFLPlayerFromGoal);
router.post('/admin/getNFLEventsG', geventController.getNFLEventsfromGoal);


router.post('/admin/goalnhlteam', teamController.updateNHLTeamsFromGoal);
router.post('/admin/goalnhlplayer', playerController.updateNHLPlayerFromGoal);

router.post('/admin/goalfbsteam', teamController.updateFBSTeamsFromGoal);
router.post('/admin/goalfbsplayer', playerController.updateFBSPlayerFromGoal);
router.post('/props/update', propController.updateProps);


module.exports = router;