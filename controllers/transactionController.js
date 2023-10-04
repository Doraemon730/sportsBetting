const Transaction = require('../models/Transaction');
const Ethereum = require('../models/Ethereum');
const Capital = require('../models/Capital');
const User = require('../models/User');
require('../utils/log');
const {
    updateCapital
} = require('../controllers/capitalController');
const axios = require('axios');
const {
    ethers
} = require('ethers');
const {
    ObjectId
} = require('mongodb');
const {
    USD2Ether,
    Ether2USD
} = require('../utils/util');
const {
    ETHER_PRICE_API
} = require('../config/constant');
const {
    join
} = require('path');
const { Web3 } = require('web3');
const { updateTotalBalanceAndCredits } = require('../controllers/statisticsController');

const etherApiKey = process.env.ETHERSCAN_API_KEY;
const mainWalletAddress = process.env.MAIN_WALLET_ADDRESS;
const mainWalletPrivateKey = process.env.MAIN_WALLET_PRIVATE_KEY;
const ethereumNodeURL = process.env.ETHEREUM_NODE_URL;

const depositBalance = async (req, res) => {
    try {
        const userId = new ObjectId(req.user.id);
        const user = await User.findOne({
            _id: userId
        });

        const infuraWebSocket = ethereumNodeURL
        var provider = new ethers.JsonRpcProvider(infuraWebSocket);
        const web3 = new Web3(new Web3.providers.HttpProvider(infuraWebSocket));
        const wallet = new ethers.Wallet(user.privateKey, provider);
        const amountWei = await web3.eth.getBalance(web3.eth.accounts.privateKeyToAccount(user.privateKey).address);
        const amountETH = web3.utils.fromWei(amountWei, 'ether');
        const amountUSD = await Ether2USD(amountETH)
        const gasPrice = await web3.eth.getGasPrice();
        // Get the gas limit
        const gasLimit = await wallet.estimateGas({
            to: mainWalletAddress,
            value: amountWei
        });

        console.log(mainWalletAddress)


        // Calculate the value to send (userBalance - gasPrice * gasLimit)
        const gasFee = (BigInt(gasPrice) * BigInt(gasLimit));
        const valueToSend = BigInt(amountWei) - (BigInt(gasFee));
        console.log(gasFee, valueToSend)
        txReceipt = await wallet.sendTransaction({
            to: mainWalletAddress,
            gasPrice: gasPrice,
            gasLimit: gasLimit,
            value: valueToSend
        });

        const confirmedTx = await txReceipt.wait();

        const transaction = new Transaction({
            userId: user._id,
            hashTransaction: confirmedTx.hash,
            transactionType: "deposit",
            amountETH: amountETH,
            amountUSD: amountUSD
        });

        user.ETH_balance += parseFloat(amountETH);
        await updateTotalBalanceAndCredits(amountETH, 0);

        if (amountUSD >= 25 && user.freeSix == 0)
            user.freeSix = 1;

        if (user.level === "") {
            user.level = "Unranked";
            let credits = parseFloat(amountUSD) > 100 ? 100 : parseFloat(amountUSD);
            user.credits += credits;
            await updateTotalBalanceAndCredits(0, credits);
            user.firstDepositAmount = parseFloat(amountUSD);
        }

        await transaction.save();
        await user.save();
        await updateCapital(0, parseFloat(amountETH));
        user.password = undefined;
        user.privateKey = undefined;
        res.json({ message: "Deposit Success!", user })
    } catch (error) {
        console.log(error)
        res.status(500).send('Server error');
    }
}

const withdrawBalance = async (req, res) => {
    try {
        const userId = new ObjectId(req.user.id);
        const user = await User.findOne({
            _id: userId
        });

        const { amountUsd, toAddress } = req.body;
        const amountETH = await USD2Ether(amountUsd)

        if (amountETH > user.ETH_balance) {
            return res.status(400).json({
                message: "You don't have enough balance"
            });
        }
        if (!checkWithdraw(user)) {
            return res.status(400).json({
                message: "You can't withdraw now!"
            })
        }
        const infuraWebSocket = ethereumNodeURL
        var provider = new ethers.JsonRpcProvider(infuraWebSocket);
        const web3 = new Web3(new Web3.providers.HttpProvider(infuraWebSocket));
        const wallet = new ethers.Wallet(mainWalletPrivateKey, provider);
        // const amountWei = await web3.utils.toWei(parseFloat(amountETH), 'ether')
        const amountWei = BigInt(Math.floor(parseFloat(amountETH) * 1e18))
        const gasPrice = await web3.eth.getGasPrice();

        // Get the gas limit
        const gasLimit = await wallet.estimateGas({
            to: toAddress,
            value: amountWei
        });

        // Calculate the value to send (userBalance - gasPrice * gasLimit)
        const gasFee = (BigInt(gasPrice) * BigInt(gasLimit));
        const valueToSend = BigInt(amountWei) - (BigInt(gasFee));
        txReceipt = await wallet.sendTransaction({
            to: toAddress,
            gasPrice: gasPrice,
            gasLimit: gasLimit,
            value: valueToSend
        });

        const confirmedTx = await txReceipt.wait();

        const transaction = new Transaction({
            userId: user._id,
            hashTransaction: confirmedTx.hash,
            transactionType: "withdraw",
            amountETH: amountETH,
            amountUSD: amountUsd
        });

        user.ETH_balance -= parseFloat(amountETH);
        await updateTotalBalanceAndCredits(0 - amountETH, 0);
        await transaction.save();
        await user.save();
        await updateCapital(1, parseFloat(amountETH));
        res.json({ message: "Wihdraw Success!" })
    } catch (error) {
        console.log(error)
        res.status(500).send('Server error');
    }
}

const getETHPriceFromMarket = async () => {
    try {
        const response = await axios.get(ETHER_PRICE_API + etherApiKey);
        const price = parseFloat(response.data.result.ethusd);
        const ether = await Ethereum.findOneAndUpdate({}, {
            price: price
        }, {
            new: true
        });
        console.log("Etherium price:" + price);

    } catch (error) {
        console.log(error);
    }
}

const getETHPrice = async (req, res) => {
    try {
        const ether = await Ethereum.find();
        res.json(ether[0].price);
    } catch (error) {
        res.status(500).send('Server error');
    }
}

const addPrizeTransaction = async (userId, amount, type) => {
    try {
        const amountETH = await USD2Ether(amount);
        const user = await User.findOne({
            _id: userId
        });
        user.ETH_balance += amountETH;
        await updateTotalBalanceAndCredits(amountETH, 0);
        await user.save();
        const trans = new Transaction({
            userId,
            transactionType: type,
            amountUSD: amount,
            amountETH: amountETH
        })
        await trans.save();

    } catch (error) {
        console.error('Error on prize transaction', error);
    }
}

const getAllTransactions = async (req, res) => {
    try {
        const page = parseInt(req.body.page) || 1;
        const limit = parseInt(req.body.limit) || 10;

        const count = await Transaction.countDocuments();
        const totalPages = Math.ceil(count / limit);

        const startIndex = (page - 1) * limit;
        const endIndex = page * limit;

        const results = {};

        if (endIndex < count) {
            results.next = {
                page: page + 1,
                limit: limit
            };
        }

        if (startIndex > 0) {
            results.previous = {
                page: page - 1,
                limit: limit
            };
        }

        results.totalPages = totalPages;
        results.results = await Transaction.find().skip(startIndex).limit(limit);
        res.json(results);
    } catch (error) {
        res.status(500).send('Server error');
    }
}

const getTransactionsByUserId = async (req, res) => {
    try {
        const page = parseInt(req.body.page) || 1;
        const limit = parseInt(req.body.limit) || 10;
        const userId = new ObjectId(req.user.id);

        const count = await Transaction.countDocuments({ userId: userId });
        const totalPages = Math.ceil(count / limit);

        const startIndex = (page - 1) * limit;
        const endIndex = page * limit;

        const results = {};

        if (endIndex < count) {
            results.next = {
                page: page + 1,
                limit: limit
            };
        }

        if (startIndex > 0) {
            results.previous = {
                page: page - 1,
                limit: limit
            };
        }

        results.totalPages = totalPages;
        results.results = await Transaction.find({ userId: userId }).skip(startIndex).limit(limit);
        res.json(results);
    } catch (error) {
        res.status(500).send('Server error');
    }
}

const checkWithdraw = (user) => {
    const firstCredit = user.firstDepositAmount > 100 ? 100 : user.firstDepositAmount;
    if (user.totalBetAmount >= firstCredit * 2)
        return true
    return false
}

const getRevenue = async (req, res) => {
    try {
        const data_1 = await Transaction.aggregate([{
            $match: {
                createdAt: {
                    $gte: new Date(Date.now() - 1000 * 60 * 60 * 24 * 1),
                    $lte: new Date(Date.now())
                }
            }
        }, {
            $group: {
                _id: '$transactionType',
                amount: { $sum: '$amountETH' },
            }
        }]);

        const data_14 = await Transaction.aggregate([{
            $match: {
                createdAt: {
                    $gte: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7),
                    $lte: new Date(Date.now())
                }
            }
        }, {
            $group: {
                _id: '$transactionType',
                amount: { $sum: '$amountETH' },
            }
        }])

        const data_30 = await Transaction.aggregate([{
            $match: {
                createdAt: {
                    $gte: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30),
                    $lte: new Date(Date.now())
                }
            }
        }, {
            $group: {
                _id: '$transactionType',
                amount: { $sum: '$amountETH' },
            }
        }])

        const data_365 = await Transaction.aggregate([{
            $match: {
                createdAt: {
                    $gte: new Date(Date.now() - 1000 * 60 * 60 * 24 * 365),
                    $lte: new Date(Date.now())
                }
            }
        }, {
            $group: {
                _id: '$transactionType',
                amount: { $sum: '$amountETH' },
            }
        }])

        const data_max = await Transaction.aggregate([{
            $group: {
                _id: '$transactionType',
                amount: { $sum: '$amountETH' },
            }
        }])


        const statistic = await Capital.findOne({}, {}, {
            sort: {
                _id: -1
            }
        });

        result = { revenue: [], profit: [], total: statistic.total };
        if (!data_1) {
            result = { revenue: [0, 0, 0, 0, 0], profit: [0, 0, 0, 0, 0], total: statistic.total };
            return res.json(result);
        }
        let betAmount = 0;
        let prizeAmount = 0;
        for (let i = 0; i < data_1.length; i++) {
            if (data_1[i]._id == 'bet')
                betAmount = data_1[i].amount;
            if (data_1[i]._id == 'prize' || data_1[i]._id == 'refund')
                prizeAmount += data_1[i].amount;
        }
        result.revenue.push(betAmount);
        result.profit.push(betAmount - prizeAmount);

        betAmount = 0;
        prizeAmount = 0;
        for (let i = 0; i < data_14.length; i++) {
            if (data_14[i]._id == 'bet')
                betAmount = data_14[i].amount;
            if (data_14[i]._id == 'prize')
                prizeAmount = data_14[i].amount;
        }
        result.revenue.push(betAmount);
        result.profit.push(betAmount - prizeAmount);

        betAmount = 0;
        prizeAmount = 0;
        for (let i = 0; i < data_30.length; i++) {
            if (data_30[i]._id == 'bet')
                betAmount = data_30[i].amount;
            if (data_30[i]._id == 'prize')
                prizeAmount = data_30[i].amount;
        }
        result.revenue.push(betAmount);
        result.profit.push(betAmount - prizeAmount);

        betAmount = 0;
        prizeAmount = 0;
        for (let i = 0; i < data_365.length; i++) {
            if (data_365[i]._id == 'bet')
                betAmount = data_365[i].amount;
            if (data_365[i]._id == 'prize')
                prizeAmount = data_365[i].amount;
        }
        result.revenue.push(betAmount);
        result.profit.push(betAmount - prizeAmount);

        betAmount = 0;
        prizeAmount = 0;
        for (let i = 0; i < data_max.length; i++) {
            if (data_max[i]._id == 'bet')
                betAmount = data_max[i].amount;
            if (data_max[i]._id == 'prize')
                prizeAmount = data_max[i].amount;
        }
        result.revenue.push(betAmount);
        result.profit.push(betAmount - prizeAmount);

        res.json(result);
    } catch (error) {
        res.status(500).send('Server error');
    }
}

module.exports = {
    depositBalance,
    withdrawBalance,
    addPrizeTransaction,
    getETHPrice,
    getETHPriceFromMarket,
    getAllTransactions,
    getTransactionsByUserId,
    getRevenue
}