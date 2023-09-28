const { ObjectId } = require('mongodb');
const cron = require('node-cron')
const axios = require('axios');
const { updateAllPromotion } = require('../controllers/userController');
const { getETHPriceFromMarket } = require('../controllers/transactionController');
const { getLiveDataByEvent, getWeeklyEventsMLB, getWeeklyEventsSoccer, getWeeklyEventsNFL } = require('../controllers/eventController');
const { getRewards } = require('../controllers/betController');

//betJob = cron.schedule
const cronWednesdaySchedule = '0 0 * * 3'; // Runs at 12:00 AM every Wednesday
const cronThursdaySchedule = '0 0 * * 4'; // Runs at 12:00 AM every Thursday
const cronEtherPriceSchedule = '* * * * *';
const cronMatchSchedule = '*/5 * * * *'; //Runs every hour
const cronWeeklySchedule = '0 0 * * 1'; //Runs every Monday
const cronMonthlySchedule = '0 0 1 * *'; //Runs every month
const cronWeekEventSchedule = '0 */3 * * *';
// Define the function to be executed by the cron job
const cronWednesdayJob = () => {

  // Your code logic here
  updateAllPromotion(1);
  console.log('Happy Wager Wednesday! May good fortune be on your side. Best of luck!');
};
const cronThursdayJob = () => {

  // Your code logic here
  updateAllPromotion(0);
  console.log("Wager Wednesday has come to a close. Let's patiently await its return next week.");
};
const cronEtherPriceJob = () => {
  getETHPriceFromMarket();
  const time = new Date().toString();
  console.log('ETH Price has been updated at : ' + time);
}

const cronWeeklyRewardJob = () => {
  getRewards(7);
  const time = new Date().toString();
  console.log('Rewards for the last week updated' + time);
}

const cronMonthlyRewardJob = () => {
  getRewards(30);
  const time = new Date().toString();
  console.log('Rewards for the last month updated' + time);
}

const cronMatchJob = () => {
  getLiveDataByEvent();
}

const cronWeekEventJob = () => {
  getWeeklyEventsMLB();
  getWeeklyEventsNFL();
  getWeeklyEventsSoccer();
}

// Set up the cron job
module.exports = {
  WednesdayJob: cron.schedule(cronWednesdaySchedule, cronWednesdayJob),
  ThursdayJob: cron.schedule(cronThursdaySchedule, cronThursdayJob),
  EtherJob: cron.schedule(cronEtherPriceSchedule, cronEtherPriceJob),
  MatchJob: cron.schedule(cronMatchSchedule, cronMatchJob),
  WeeklyRewardJob: cron.schedule(cronWeeklySchedule, cronWeeklyRewardJob),
  MonthlyRewardJob: cron.schedule(cronMonthlySchedule, cronMonthlyRewardJob),
  WeekEventJob: cron.schedule(cronWeekEventSchedule, cronWeekEventJob)
};