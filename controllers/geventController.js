const Event = require('../models/Event');
const Player = require('../models/Player');
const CFPlayer = require('../models/CFPlayer');
const Prop = require('../models/Prop');
const User = require('../models/User');
const Team = require('../models/Team');
const Bet = require('../models/Bet');

const axios = require('axios');
const {
    fetchNBAMatchData,
    fetchNFLMatchData
} = require('../services/eventService');

const getNBAMatchData = async () => {
    let matchData = fetchNBAMatchData();
}

const getNFLMatchData = async () => {
    let matchData = fetchNFLMatchData();
}

module.exports = {
    getNBAMatchData,
    getNFLMatchData
}