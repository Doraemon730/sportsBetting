const crypto = require('crypto');

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

module.exports = generateReferralCode;