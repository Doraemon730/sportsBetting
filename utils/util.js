const crypto = require('crypto');
const Ethereum = require('../models/Ethereum');

function generateReferralCode() {
    const randomString = generateRandomString(6); // Specify the desired length of the random string
    const timestamp = Date.now().toString();
    const hash = crypto.createHash('sha256').update(randomString + timestamp).digest('hex');
    const referralCode = hash.substring(0, 10); // Specify the desired length of the referral code

    return referralCode;
}

function generateRandomString(length) {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let randomString = '';

    for (let i = 0; i < length; i++) {
        const randomIndex = Math.floor(Math.random() * characters.length);
        randomString += characters.charAt(randomIndex);
    }

    return randomString;
}

async function Ether2USD(amount) {
    const etherPrice = await Ethereum.find();
    return amount * etherPrice[0].price;
}

async function USD2Ether(amount) {
    const etherPrice = await Ethereum.find();
    return amount / etherPrice[0].price;
}

module.exports = { generateReferralCode, Ether2USD, USD2Ether };