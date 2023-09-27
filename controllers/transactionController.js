const Transaction = require('../models/Transaction');
const Ethereum = require('../models/Ethereum');
const User = require('../models/User');
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

const etherApiKey = process.env.ETHERSCAN_API_KEY;
const mainWalletAddress = process.env.MAIN_WALLET_ADDRESS;
const mainWalletPrivateKey = process.env.MAIN_WALLET_PRIVATE_KEY;

const depositBalance = async (req, res) => {
    try {
        const userId = new ObjectId(req.user.id);
        const user = await User.findOne({
            _id: userId
        });

        const infuraWebSocket = "https://eth.llamarpc.com"
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

        if (amountUSD >= 25 && user.freeSix == 0)
            user.freeSix = 1;

        if (user.level === "") {
            user.level = "Unranked";
            user.credits += parseFloat(amountUSD) > 100 ? 100 : parseFloat(amountUSD);
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

        const { amountUSD, toAddress } = req.body;
        const amountETH = await USD2Ether(amountUSD)

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
        const infuraWebSocket = "https://eth.llamarpc.com"
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
            amountUSD: amountUSD
        });

        user.ETH_balance -= parseFloat(amountETH);
        await transaction.save();
        await user.save();
        await updateCapital(1, parseFloat(amountETH));
        res.json({ message: "Wihdraw Success!" })
    } catch (error) {
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
        console.log(error.message);
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

const addPrizeTransaction = async (userId, amount) => {
    try {
        const amountETH = await USD2Ether(amount);
        const user = await User.findOne({
            _id: userId
        });
        user.ETH_balance += amountETH;
        await user.save();
        const trans = new Transaction({
            userId,
            transactionType: 'prize',
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

const checkWithdraw = (user) => {
    const firstDeposit = user.firstDepositAmount;
    const firstCredit = firstDeposit > 100 ? 100 : firstDeposit;
    if (user.totalBetAmount >= firstDeposit + firstCredit)
        return true
    return false
}

module.exports = {
    depositBalance,
    withdrawBalance,
    addPrizeTransaction,
    getETHPrice,
    getETHPriceFromMarket,
    getAllTransactions,
}