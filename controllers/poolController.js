const Event = require('../models/Event');
const Sport = require('../models/Sport');
const User = require('../models/User');
const Pools = require('../models/Pools');
const Transaction = require("../models/Transaction");
const PoolBet = require('../models/Poolbets');
const { USD2Ether, Ether2USD } = require("../utils/util");
const { setUserLevel } = require("../controllers/userController");
const { getReferralPrize } = require("../controllers/referralController")
const { updateBetWithDaily, updateBetWithNew, updateTotalBalanceAndCredits } = require('./statisticsController');
require('../utils/log');
const { ObjectId } = require("mongodb");
const { getISOWeek } = require('date-fns');

// const mutex = require('async-mutex')
// const lock = new mutex.Mutex();
// const redis = require('redis');
// const client = redis.createClient();

const getMatchList = async (req, res) => {
    let { sports } = req.body;
    
    //validation check
    if(sports.length === 0) {
        return res.status(400).json({ message: "Invalid sports" });
    }
    
    let sportsData = await Sport.findOne({ name: sports });
    if(!sportsData) {
        return res.status(400).json({ message: "Invalid sports" });
    }

    const today = new Date();
    const dayOfWeek = today.getDay();

    // Check if today is Tuesday to Thursday
    if (dayOfWeek < 2 || dayOfWeek > 4) { // 0 is Sunday, 1 is Monday, and so on
        return res.status(400).send('Error : You can only get list from Tuesday to Thursday'); // Return empty array if not Tuesday or Wednesday
    }

    // Calculate the start and end dates for the current week
    const startDate = new Date(today);
    startDate.setDate(today.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 2)); // Adjust for Sunday

    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + 7);

    try {
        const events = await Event.find({
            sportId: sportsData._id, //'650e0b6fb80ab879d1c142c8',
            startTime: { $gte: startDate, $lte: endDate },
            // state: 0
        });
        const startedEvents = events.filter(event => event.state != 0);
        if( startedEvents.length != 0 ) {
            return res.status(400).send('Error : First match already started, You cant get list');
        }

        let pool = await Pools.findOne({ISOweek: '' + new Date().getFullYear() + getISOWeek(new Date()), sportId: sportsData._id})
        if(!pool) {
            pool = new Pools({
                ISOweek: '' + new Date().getFullYear() + getISOWeek(new Date()), 
                sportId: sportsData._id,
                startTime: new Date(),
            });
            pool.save();
        }

        let games = events.map(event => ({
            _id: event._id,
            startTime: event.startTime,
            competitors: event.competitors,
            name: event.name,
          }));
        
        let pool_res = {
            games,
            prizepool: pool.prizepool / 0.9,
            participants: pool.participants.length
        };
        return res.json(pool_res);
    } catch (error) {
        console.error('Error retrieving events:', error);
        res.status(500).send('Error retrieving events:');
    }
}

const checkPoolBet = async (req, res) => {
    let { sports } = req.body;
    
    //validation check
    if(sports.length === 0) {
        return res.status(400).json({ message: "Invalid sports" });
    }
    
    let sportsData = await Sport.findOne({ name: sports });
    if(!sportsData) {
        return res.status(400).json({ message: "Invalid sports" });
    }

    const today = new Date();
    const dayOfWeek = today.getDay();

    // Check if today is Tuesday to Thursday
    if (dayOfWeek < 2 || dayOfWeek > 4) { // 0 is Sunday, 1 is Monday, and so on
        return res.status(400).send('Error : You can only get list from Tuesday to Thursday'); // Return empty array if not Tuesday or Wednesday
    }


    let pool = await Pools.findOne({ISOweek: '' + new Date().getFullYear() + (getISOWeek(new Date()) - 1), sportId: sportsData._id})
    if(!pool) {
        return res.status(400).send('Error : No betPool registered');
    }
    if( pool.state == 3 ) {
        return res.status(400).send('Error : Poolbet is already checked');
    }

    let isAllFinished = true;
    let poolbets = await PoolBet.find({ISOweek: pool.ISOweek, sportId: pool.sportId});
    console.log(poolbets.length)
    for (let bet of poolbets) {
        let wins = 0;
        for(let e of bet.events) {
            wins = e.isSkipped ? wins + 1 : e.result == e.betResult ? wins + 1 : wins;
            isAllFinished = e.betResult == -100 && !e.isSkipped ? false : isAllFinished;
        }
        bet.wins = wins;
        pool.topwins = pool.topwins < wins ? wins : pool.topwins;
        bet.save();
    }

    if(isAllFinished) {
        pool.state = 3;
        let winners = poolbets.filter(bet => bet.wins == pool.topwins);
        pool.winners = winners.map(winner => ({
            _id: new ObjectId(winner.userId)
        }))

        const entryFee = pool.prizepool / winners.length;
        for(let winner of winners) {
            let user = await User.findOne({_id: new ObjectId(winner.userId)})
            console.log(winner.userId);
            console.log(user)
            winner.prize = entryFee;
            const entryFeeEther = await USD2Ether(entryFee);

            // // Save the bet
            user.ETH_balance += entryFeeEther;
            await updateTotalBalanceAndCredits(entryFeeEther, 0);

            user.isPending = false;

            //transaction
            const transaction = new Transaction({
                userId : winner.userId,
                amountETH: entryFeeEther,
                amountUSD: entryFee,
                transactionType: "prize"
            });
            await transaction.save();
            await user.save();
        }
    }
    

    pool.save();
    
    //return pool.state == 3 ? res.json({message: 'Betcheck is finished'}) : res.status(400).json({message: 'Error: Betcheck is not finished'})
    return res.json(pool);
}

const getBetRes = async (req, res) => {
    let { sports } = req.body;
    const userId = new ObjectId(req.user.id);
    
    //validation check
    if(sports.length === 0) {
        return res.status(400).json({ message: "Invalid sports" });
    }
    
    let sportsData = await Sport.findOne({ name: sports });
    if(!sportsData) {
        return res.status(400).json({ message: "Invalid sports" });
    }

    const today = new Date();
    const dayOfWeek = today.getDay();

    // Check if today is Tuesday to Thursday
    if (dayOfWeek < 2 || dayOfWeek > 4) { // 0 is Sunday, 1 is Monday, and so on
        return res.status(400).send('Error : You can only get list from Tuesday to Thursday'); // Return empty array if not Tuesday or Wednesday
    }

    // Check valid user
    let user = await User.findOne({ _id: userId });
    if(!user) {
        return res.status(400).send('Error : Not registered user');
    }

    const isoweek = dayOfWeek > 3 ? getISOWeek(new Date()) : getISOWeek(new Date()) - 1;
    const pool = await Pools.findOne({ISOweek: '' + new Date().getFullYear() + isoweek, sportId: sportsData._id})
    if(!pool) {
        return res.status(400).send('Error : No betPool registered');
    }
    if( pool.state != 3 ) {
        return res.status(400).send('Error : Poolbet is not finished');
    }

    return res.json({
        participants: pool.participants.length,
        prizepool: pool.prizepool,
        topwins: pool.topwins,
        winners: pool.winners});
    
}

const betPool = async (req, res) => {
    try {
        // console.log(JSON.stringify(req.body));
        let { betAmount, betResults, sports, currencyType } = req.body;
        const userId = new ObjectId(req.user.id);
        betResults = JSON.parse(betResults);
        
        // Validate inputs
        
        const sportsData = await Sport.findOne({ name: sports });
        if(!sportsData) {
            return res.status(400).json({ message: "Invalid sports" });
        }
        const sportId = new ObjectId(sportsData._id);

        /////
        const today = new Date();
        const dayOfWeek = today.getDay();
        const startDate = new Date(today);
        startDate.setDate(today.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 2)); // Adjust for Sunday

        const endDate = new Date(startDate);
        endDate.setDate(startDate.getDate() + 7);

        const events = await Event.find({
            sportId: sportsData._id, //'650e0b6fb80ab879d1c142c8',
            startTime: { $gte: startDate, $lte: endDate },
            // state: 0
        });
        
        if(betResults.length != events.length) {
            return res.status(400).json({ message: "Invalid Betting." });
        }
        
        const skipped_bets = betResults.filter(e => e.isSkipped).length;
        console.log(betAmount)
        console.log(skipped_bets)
        if(!((betAmount == 10 && skipped_bets <= 0) || (betAmount == 20 && skipped_bets <= 1) || (betAmount == 40 && skipped_bets <= 2) || (betAmount == 80 && skipped_bets <= 3))) {
            return res.status(400).json({ message: "Invalid Betting." });
        }
        
        let user = await User.findOne({ _id: userId });
        if (user.isPending) {
            return res.status(400).json({ message: "You are pending." });
        }
        user.isPending = true;
        await user.save();


        // ---check if betResults are correct
        for (const bet of betResults) {
            const event = await Event.findById(bet.eventId);
            if (!event) {
                user.isPending = false;
                await user.save();
                return res.status(400).send({ message: "Invalid Contest." });
            }
            if (event.startTime <= new Date().getTime()) {
                user.isPending = false;
                await user.save();
                return res.status(400).send({ message: "Contest has already started." });
            }

        }

        // Check balance
        let entryFee = betAmount;// * 0.9;
        console.log(entryFee)
        if (currencyType === "ETH") {
            entryFee = await Ether2USD(entryFee);
        }
        console.log(entryFee)

        const entryFeeEtherSave = await USD2Ether(entryFee);
        console.log(entryFeeEtherSave)
        const entryFeeSave = entryFee;
        // let temp = user.credits;
        // let creditSave = 0;
        // let credits = user.credits
        // credits -= entryFee;
        // creditSave = credits > 0 ? entryFee : temp;
        // credits = credits > 0 ? credits : 0;
        // entryFee = entryFee - temp;
        // entryFee = entryFee > 0 ? entryFee : 0;


        const entryFeeEther = await USD2Ether(entryFee);

        console.log(JSON.stringify(user))
        console.log(entryFeeEther)
        if (!user || user.ETH_balance < entryFeeEther) {
            user.isPending = false;
            await user.save();
            return res.status(400).json({ message: "Insufficient Balance." });
        }

        let willFinishAt = new Date();
        for (const element of betResults) {
            let event = await Event.findOne({ _id: new ObjectId(element.eventId) })
            if (event.startTime > willFinishAt)
                willFinishAt = event.startTime;
        }

        // Create the bet
        const myBet = new PoolBet({
            userId,
            entryFee: entryFeeSave,
            entryFeeETH: entryFeeEtherSave,
            serverFeeETH: entryFeeEtherSave / 10,
            events: betResults.map(result => ({
                event: result.eventId,
                result: result.matchResult ? result.matchResult : -100,
                isSkipped: result.isSkipped,
            })),
            ISOweek: '' + new Date().getFullYear() + getISOWeek(new Date()),
            sportId
        });

        // // Save the bet
        user.ETH_balance -= entryFeeEther;
        // user.credits = credits;
        user.totalBetAmount += parseFloat(entryFeeSave);
        user = setUserLevel(user);
        await updateTotalBalanceAndCredits(0 - entryFeeEther, 0);

        user.isPending = false;

        await myBet.save();
        await user.save();

        //transaction
        const transaction = new Transaction({
            userId,
            amountETH: entryFeeEtherSave,
            amountUSD: entryFeeSave,
            transactionType: "bet"
        });
        await transaction.save();
        
        getReferralPrize(user._id, entryFeeEtherSave);

        const pool = await Pools.findOne({ISOweek: '' + new Date().getFullYear() + (getISOWeek(new Date())-0), sportId: sportsData._id})
        pool.participants.push({poolbetId: myBet._id});
        pool.prizepool += Number(entryFee * 0.9);
        pool.prizepoolETH += Number(entryFeeEther * 0.9);
        pool.save();

        user.password = undefined;
        user.privateKey = undefined;
        res.json({ betInfo: myBet, userInfo: user });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
}
module.exports = {
    getMatchList,
    betPool,
    checkPoolBet,
    getBetRes
}