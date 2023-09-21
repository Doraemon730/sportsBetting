const Referral = require('../models/Referral');
const User = require('../models/User');

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

    const page = parseInt(req.body.page) || 1;
    const limit = parseInt(req.body.limit) || 10;

    const count = await Referral.countDocuments();
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
    results.results = await Referral.aggregate([{
        $lookup: {
            from: 'users',
            localField: 'referralCode',
            foreignField: 'myReferralCode',
            as: 'userInfo',
        }
    },
    { $unwind: '$userInfo' },
    {
        $project: {
            _id: 1,
            referralCode: 1,
            level: 1,
            invitesList: 1,
            userId: 1,
            firstName: '$userInfo.firstName',
            lastName: '$userInfo.lastName',
            email: '$userInfo.email'
        },
    },
    { $skip: (page - 1) * limit }, // Skip documents based on the page number and limit
    { $limit: limit },]);

    // const referralsWithUserDetails = await User.populate(referrals, { path: 'userId', select: 'firstName lastName credits ETH_balance' });
    res.status(200).json(results);
}

const getReferralPrize = async (referralCode, invitedUserId, betAmount) => {
    const referral = await Referral.findOne({ referralCode });
    if (!referral) {
        return;
    }
    const user = await User.findOne({ _id: referral.userId });

    const checkUserLevel = () => {
        const bettingUsers = referral.invitesList.filter((i) => i.betAmount > 0);
        if (bettingUsers.length > 100) {
            if (referral.level == 1) {
                referral.level = 2;
                const sum = bettingUsers.reduce((a, b) => a + b.betAmount, 0);
                user.ETH_balance += sum * 0.003;
            }
            if (bettingUsers.length > 250) {
                if (referral.level == 2) {
                    referral.level = 3;
                    const sum = bettingUsers.reduce((a, b) => a + b.betAmount, 0);
                    user.ETH_balance += sum * 0.0035;
                }
            }
        }
    }
    const updatedList = referral.invitesList.map((i) => {
        if (i.invitedUserId.toString() === invitedUserId.toString()) {
            i.betAmount += parseFloat(betAmount);
        }
        return i;
    });
    referral.invitesList = updatedList;
    switch (referral.level) {
        case 1:
            user.ETH_balance += betAmount * 0.007;
            checkUserLevel();
            break;
        case 2:
            user.ETH_balance += betAmount * 0.01;
            checkUserLevel();
            break;
        case 3:
            user.ETH_balance += betAmount * 0.0135;
            break;
    }
    await referral.save();
    await user.save();
}

module.exports = { setReferralLevel, getAllReferrals, getReferralPrize };