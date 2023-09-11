const {ObjectId} = require('mongodb');
const cron = require('node-cron')
const axios = require('axios');
const {updateAllPromotion} = require('../controllers/userController');
const { getETHPriceFromMarket } = require('../controllers/transactionController');

//betJob = cron.schedule
const cronWednesdaySchedule = '0 0 * * 3'; // Runs at 12:00 AM every Wednesday
const cronThursdaySchedule = '0 0 * * 4'; // Runs at 12:00 AM every Thursday
const cronEtherPriceSchedule = '* * * * *'; 
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
  console.log('ETH Price has been updated at :'+ time);
}

// Set up the cron job
module.exports = {
  WednesdayJob: cron.schedule(cronWednesdaySchedule, cronWednesdayJob),
  ThursdayJob: cron.schedule(cronThursdaySchedule, cronThursdayJob),
  EtherJob: cron.schedule(cronEtherPriceSchedule, cronEtherPriceJob),
};