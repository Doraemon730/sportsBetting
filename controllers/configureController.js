const Configure = require('../models/Configure');
require('../utils/log');
const setBetAmountLimit = async (req, res) => {
    const { minBetAmount, maxBetAmount } = req.body;
    if (!minBetAmount || !maxBetAmount) {
        return res.status(400).json({ message: 'Please provide min and max bet amount' });
    }
    if (minBetAmount > maxBetAmount) {
        return res.status(400).json({ message: 'Min bet amount should be less than max bet amount' });
    }
    let configre = await Configure.findOne();
    if (!configre) {
        configre = new Configure({ minBetAmount, maxBetAmount });
    } else {
        configre.minBetAmount = minBetAmount;
        configre.maxBetAmount = maxBetAmount;
    }
    await configre.save();
    res.status(200).json({ message: 'Bet amount limit updated' });
}

const getBetAmountLimit = async (req, res) => {
    const configre = await Configure.findOne().select('minBetAmount maxBetAmount');
    res.status(200).json(configre);
}

module.exports = { setBetAmountLimit, getBetAmountLimit };