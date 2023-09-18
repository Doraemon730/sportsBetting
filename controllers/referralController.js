const Referral = require('../models/Referral');

const setReferralLevel = async (req, res) => {
    const { referralCode, teir } = req.body;
    if (!referralCode || !teir) {
        return res.status(400).json({
            message: 'Bad Request'
        })
    }
    if (teir < 0 || teir > 3) {
        return res.status(400).json({
            message: 'Teir must be between 1 and 3'
        })
    }
    const referral = await Referral.findOne({ referralCode });
    if (teir < referral.level) {
        return res.status(400).json({
            message: 'Teir cannot be less than current level'
        })
    }
    referral.level = teir;
    await referral.save();
    res.status(200).json({
        message: 'Referral level updated'
    })
}

const getAllReferrals = async (req, res) => {
    const referrals = await Referral.find();
    res.status(200).json(referrals);
}

module.exports = { setReferralLevel, getAllReferrals };