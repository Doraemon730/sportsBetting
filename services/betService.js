const {ObjectId} = require('mongodb');
const cron = require('node-cron')
const axios = require('axios');
const {updateAllPromotion} = require('../controllers/userController');
const apiKey = process.env.NBA_API_KEY;
const baseUrl = process.env.NBA_API_BASEURL;
const locale = process.env.NBA_API_LOCALE;   

//betJob = cron.schedule
const cronWednesdaySchedule = '0 0 * * 3'; // Runs at 12:00 AM every Wednesday

// Define the function to be executed by the cron job
const cronWednesdayJob = () => {

  // Your code logic here
  updateAllPromotion(1);
  console.log('Cron job executed on Wednesday');
};

// Set up the cron job
cron.schedule(cronWednesdaySchedule, cronWednesdayJob);