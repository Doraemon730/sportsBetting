const crypto = require('crypto');
const nodemailer = require('nodemailer');
const Ethereum = require('../models/Ethereum');

const generateReferralCode = () => {
    const randomString = generateRandomString(6); // Specify the desired length of the random string
    const timestamp = Date.now().toString();
    const hash = crypto.createHash('sha256').update(randomString + timestamp).digest('hex');
    const referralCode = hash.substring(0, 10); // Specify the desired length of the referral code

    return referralCode;
}

const generateRandomString = length => {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let randomString = '';

    for (let i = 0; i < length; i++) {
        const randomIndex = Math.floor(Math.random() * characters.length);
        randomString += characters.charAt(randomIndex);
    }

    return randomString;
}

const sendEmail = async (email, subject, text) => {
    const transporter = nodemailer.createTransport({
        host: 'smtp.gmail.com',
        port: 587,
        auth: {
            user: process.env.FROM_MAIL,
            pass: process.env.FROM_PASS,
        },
    });
    const mailOptions = {
        from: process.env.FROM_MAIL,
        to: email,
        subject: subject,
        text: text,
    };

    return new Promise((resolve, reject) => {
        transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
                reject(error);
            } else {
                resolve({ res: "Mail sent successfully. Please check your Email Inbox." });
            }
        });
    });
};

const Ether2USD = async amount => {
    const etherPrice = await Ethereum.find();
    return amount * etherPrice[0].price;
}

const USD2Ether = async amount => {
    const etherPrice = await Ethereum.find();
    return amount / etherPrice[0].price;
}

const isEmpty = async (stringVariable) => {
    if (stringVariable === undefined || stringVariable === null || stringVariable === '') {
        return true;
    } else {
        return false;
    }
}

module.exports = { generateReferralCode, sendEmail, Ether2USD, USD2Ether, isEmpty, };