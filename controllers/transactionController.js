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
    USD2Ether
} = require('../utils/util');
const {
    ETHER_PRICE_API
} = require('../config/constant');
const {
    join
} = require('path');
const { Web3 } = require('web3');

const etherApiKey = process.env.ETHERSCAN_API_KEY;
const walletPrivateKey = process.env.ETHERSCAN_API_KEY;
const infura_project_id = process.env.INFURA_PROJECT_ID;

const infuraWebSocket = process.env.ETHEREUM_NODE_URL;
const web3 = new Web3(new Web3.providers.HttpProvider(infuraWebSocket));
const depositBalance = async (req, res) => {
    try {
        const userId = new ObjectId(req.user.id);
        const {
            hashTransaction
        } = req.body;
        const user = await User.findOne({
            _id: userId
        });

        const response = await axios.get(`https://api.etherscan.io/api?module=proxy&action=eth_getTransactionByHash&txhash=${hashTransaction}&apikey=${etherApiKey}`);
        const transactionData = response.data.result;

        if (transactionData.blockNumber) {
            if (user.walletAddress !== transactionData.from) {
                return res.status(400).json({
                    message: "You are not the owner of this balance"
                });
            }

            const check = await Transaction.findOne({
                hashTransaction
            });
            if (check) {
                return res.status(400).json({
                    message: "This transaction has already been used before."
                });
            }

            const etherAmount = parseFloat(BigInt(transactionData.value)) / 1e18;
            const transaction = new Transaction({
                userId,
                hashTransaction,
                transactionType: "deposit",
                amount: etherAmount
            });

            user.ETH_balance += etherAmount;

            await transaction.save();
            await user.save();
            await updateCapital(0, etherAmount);
            res.json({
                message: "Transaction successful"
            });
        } else {
            return res.status(400).json({
                message: "Transaction not successful!"
            });
        }
    } catch (error) {
        res.status(500).json({
            message: "An error occurred"
        });
    }
}

const withdrawBalance = async (req, res) => {

    const userId = new ObjectId(req.user.id);
    const user = await User.findOne({
        _id: userId
    });
    if (!user.walletAddress) {
        return res.status(400).json({
            message: "You need to link a wallet first"
        });
    }

    const provider = new ethers.providers.JsonRpcProvider(`https://mainnet.infura.io/v3/${infura_project_id}`);

    const privateKey = walletPrivateKey;
    const wallet = new ethers.Wallet(privateKey, provider);
    const recipientAddress = user.walletAddress;

    const amountToSend = ethers.utils.parseEther('1.0');
    if (amountToSend > user.ETH_balance) {
        return res.status(400).json({
            message: "You don't have that much ETH"
        });
    }

    (async () => {
        try {
            const transaction = {
                to: recipientAddress,
                value: amountToSend,
            };

            const sendTransaction = await wallet.sendTransaction(transaction);
            const status = await sendTransaction.wait();
            if (status === "success") {
                console.log('Transaction sent:', sendTransaction.hash);
                user.ETH_balance -= amountToSend;
                await user.save();
                const trans = new Transaction({
                    userId,
                    hashTransaction: sendTransaction.hash,
                    transactionType: "withdraw",
                    amount: amountToSend
                });
                await trans.save();
                await updateCapital(1, amountToSend);
                res.json({
                    message: "Withdraw successful"
                });
            }

        } catch (error) {
            console.error('Error sending ETH:', error);
        }
    })();
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
        amount = await USD2Ether(amount);
        const user = await User.findOne({
            _id: userId
        });
        user.ETH_balance += amount;
        await user.save();
        const trans = new Transaction({
            userId,
            transactionType: 'prize',
            amount
        })
        await trans.save();

    } catch (error) {
        console.error('Error on prize transaction', error);
    }
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
        const amount = 0.001;
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
        const txObject = {
            to: toAddress,
            value: amountWei,
            gasPrice: web3.utils.toWei('31500', 'gwei'), // Adjust gas price as needed
            gasLimit: web3.utils.toWei('31500', 'gwei'), // Adjust gas limit as needed
        };

        // Get the nonce for the sender's address
        const senderAddress = web3.eth.accounts.privateKeyToAccount(privateKey).address;
        const nonce = await web3.eth.getTransactionCount(senderAddress);

        // Sign and send the transaction
        const signedTx = await web3.eth.accounts.signTransaction({
            ...txObject,
            nonce,
        }, privateKey);

        const txReceipt = await web3.eth.sendSignedTransaction(signedTx.rawTransaction);

        res.json({
            message: 'Payment successful',
            transactionHash: txReceipt.transactionHash
        });

    } catch (error) {
        console.log(error);
        res.status(500).send(error.message);
    }
}
module.exports = {
    depositBalance,
    withdrawBalance,
    addPrizeTransaction,
    getETHPrice,
    getETHPriceFromMarket,
    makePayment
}