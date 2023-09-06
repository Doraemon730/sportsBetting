const {ObjectId} = require('mongodb');
const axios = require('axios');

const apiKey = process.env.NBA_API_KEY;
const baseUrl = process.env.NBA_API_BASEURL;
const locale = process.env.NBA_API_LOCALE;   

