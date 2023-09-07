const {ObjectId} = require('mongodb');
const cron = require('node-cron')
const axios = require('axios');

const apiKey = process.env.NBA_API_KEY;
const baseUrl = process.env.NBA_API_BASEURL;
const locale = process.env.NBA_API_LOCALE;   

//betJob = cron.schedule
