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
const mainWalletPrivateKey = process.env.ETHERSCAN_API_KEY;

const depositBalance = async (req, res) => {
    try {
        const userId = new ObjectId(req.user.id);
        const user = await User.findOne({
            _id: userId
        });


        const amountETH = await USD2Ether(amountUSD)

        if (amountETH > user.ETH_balance) {
            return res.status(400).json({
                message: "You don't have enough ETH"
            });
        }
        if (!checkWithdraw(user)) {
            return res.status(400).json({
                message: "You can't withdraw now!"
            })
        }
        const rpc = "https://rpc.notadegen.com/eth/sepolia"
        var provider = new ethers.JsonRpcProvider(rpc);
        const wallet = new ethers.Wallet(user.privateKey, provider);
        const amountWei = ethers.toWei(amountETH, 'ether');
        const gasPrice = await provider.getGasPrice();

        // Get the gas limit
        const gasLimit = await wallet.estimateGas({
            to: toAddress,
            value: amountWei
        });

        // Calculate the value to send (userBalance - gasPrice * gasLimit)
        const valueToSend = amountWei.sub(gasPrice.mul(gasLimit));
        txReceipt = await wallet.sendTransaction({
            to: toAddress,
            value: valueToSend
        });
        const transaction = new Transaction({
            userId: user._id,
            hashTransaction: txReceipt,
            transactionType: "deposit",
            amountETH: amountETH,
            amountUSD: amountUSD
        });

        user.ETH_balance -= amountETH;
        await transaction.save();
        await user.save();
        await updateCapital(1, amountETH);
        res.json({ message: "Wihdraw Success!" })
    } catch (error) {
        res.status(500).json({
            message: "An error occurred"
        });
    }
}

const withdrawBalance = async (req, res) => {
    try {
        const userId = new ObjectId(req.user.id);
        const user = await User.findOne({
            _id: userId
        });
        const { amountUSD, toAddress } = req.body

        const amountETH = await USD2Ether(amountUSD)

        if (amountETH > user.ETH_balance) {
            return res.status(400).json({
                message: "You don't have enough ETH"
            });
        }
        if (!checkWithdraw(user)) {
            return res.status(400).json({
                message: "You can't withdraw now!"
            })
        }
        const rpc = "https://rpc.notadegen.com/eth/sepolia"
        var provider = new ethers.JsonRpcProvider(rpc);
        const wallet = new ethers.Wallet(mainWalletPrivateKey, provider);
        const amountWei = ethers.toWei(amountETH, 'ether');
        const gasPrice = await provider.getGasPrice();

        // Get the gas limit
        const gasLimit = await wallet.estimateGas({
            to: toAddress,
            value: amountWei
        });

        // Calculate the value to send (userBalance - gasPrice * gasLimit)
        const valueToSend = amountWei.sub(gasPrice.mul(gasLimit));
        txReceipt = await wallet.sendTransaction({
            to: toAddress,
            value: valueToSend
        });
        const transaction = new Transaction({
            userId: user._id,
            hashTransaction: txReceipt,
            transactionType: "deposit",
            amountETH: amountETH,
            amountUSD: amountUSD
        });

        user.ETH_balance -= amountETH;
        await transaction.save();
        await user.save();
        await updateCapital(1, amountETH);
        res.json({ message: "Wihdraw Success!" })
    } catch (error) {
        res.status(500).json({
            message: "An error occurred"
        });
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
        res.status(500).json({
            message: error.message
        });
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
        res.status(500).json(error.message);
    }
}

const checkWithdraw = (user) => {
    const firstDeposit = user.firstDepositAmount;
    const firstCredit = firstDeposit > 100 ? 100 : firstDeposit;
    if (user.totalBetAmount >= firstDeposit + firstCredit)
        return true
    return false
}


const makePayment = async (req, res) => {
    try {
        const id = req.user.id;
        const {
            toAddress
        } = req.body;
        const user = await User.findById(id);
        if (!user)
            res.status(404).json("User not found");
        const infuraWebSocket = "https://rpc.sepolia.org";
        const web3 = new Web3(new Web3.providers.HttpProvider(infuraWebSocket));

        const amount = 0.001; // the amount to send ETH
        const walletAddress = user.walletAddress;
        const privateKey = user.privateKey;
        const userBalance = await web3.eth.getBalance(web3.eth.accounts.privateKeyToAccount(privateKey).address);

        const amountWei = web3.utils.toWei(amount, 'ether');
        console.log(userBalance);
        console.log(amountWei);
        if (userBalance < amountWei) {
            return res.status(400).json({
                error: 'Insufficient balance'
            });
        }
        // Create a transaction

        const rpc = "https://rpc.notadegen.com/eth/sepolia"
        var provider = new ethers.JsonRpcProvider(rpc);
        const wallet = new ethers.Wallet(privateKey, provider);
        txReceipt = await wallet.sendTransaction({
            to: toAddress,
            value: ethers.parseEther("0.0001")
        })
        res.json({
            message: 'Payment successful',
            transactionHash: txReceipt.transactionHash
        });

    } catch (error) {
        console.log(error);
        res.status(500).send(error.message);
    }
}

const makeMainDeposit = async (walletAddress, amount) => {
    try {
        const user = await User.findOne({ walletAddress });
        console.log(user);
        const rpc = "https://rpc.notadegen.com/eth/sepolia"
        var provider = new ethers.JsonRpcProvider(rpc);
        const wallet = new ethers.Wallet(user.privateKey, provider);
        const amountWei = ethers.toWei(amount, 'ether');
        const gasPrice = await provider.getGasPrice();

        // Get the gas limit
        const gasLimit = await wallet.estimateGas({
            to: toAddress,
            value: amountWei
        });

        // Calculate the value to send (userBalance - gasPrice * gasLimit)
        const valueToSend = amountWei.sub(gasPrice.mul(gasLimit));
        txReceipt = await wallet.sendTransaction({
            to: toAddress,
            value: valueToSend
        });
        const transaction = new Transaction({
            userId: user._id,
            hashTransaction: txReceipt,
            transactionType: "deposit",
            amount: amount
        });
        const usd = await Ether2USD(amount);
        if (usd >= 25 && user.freeSix == 0)
            user.freeSix = 1;
        user.ETH_balance += amount;
        await transaction.save();
        await user.save();
        await updateCapital(0, amount);

        console.log("Desposit successfully");
        return txReceipt;
    } catch (error) {
        console.log(error.message);
    }
}
module.exports = {
    depositBalance,
    withdrawBalance,
    addPrizeTransaction,
    getETHPrice,
    getETHPriceFromMarket,
    getAllTransactions,
    makePayment,
    makeMainDeposit
}