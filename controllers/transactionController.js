const Transaction = require('../models/Transaction');
const User = require('../models/User');
const etherApiKey = process.env.ETHERSCAN_API_KEY;
const axios = require('axios');
const { ObjectId } = require('mongodb');

const depositBalance = async (req, res) => {
    try {
        const userId = new ObjectId(req.user.id);
        const { hashTransaction } = req.body;
        const user = await User.findOne({ _id: userId });

        const response = await axios.get(`https://api.etherscan.io/api?module=proxy&action=eth_getTransactionByHash&txhash=${hashTransaction}&apikey=${etherApiKey}`);
        const transactionData = response.data.result;

        if (transactionData.blockNumber) {
            if (user.walletAddress !== transactionData.from) {
                return res.status(400).json({ message: "You are not the owner of this balance" });
            }

            const check = await Transaction.findOne({ hashTransaction });
            if (check) {
                return res.status(400).json({ message: "This transaction has already been used before." });
            }

            const etherAmount = parseFloat(BigInt(transactionData.value)) / 1e18;
            const transaction = new Transaction({
                userId,
                hashTransaction,
                transactionType: "deposit",
                amount: etherAmount,
                currency: "ETH"
            });

            user.ETH_balance += etherAmount;

            await transaction.save();
            await user.save();

            res.json({ message: "Transaction successful" });
        } else {
            return res.status(400).json({ message: "Transaction not successful!" });
        }
    } catch (error) {
        res.status(500).json({ message: "An error occurred" });
    }
}

const withdrawBallance = async (req, res) => {
    const { ballance } = req.body;
    const transaction = await Transaction.create({ ballance });
    res.send(transaction);
}

module.exports = { depositBalance, withdrawBallance }