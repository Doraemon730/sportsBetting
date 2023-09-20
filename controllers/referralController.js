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

    const page = parseInt(req.body.page) || 1;
    const limit = parseInt(req.body.limit) || 10;

    const count = await Referral.countDocuments();
    console.log(count);
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

module.exports = { setReferralLevel, getAllReferrals };