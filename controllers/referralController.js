const Referral = require('../models/Referral');
const User = require('../models/User');
const Bonus = require('../models/Bonus');
const { ObjectId } = require("mongodb");
require('../utils/log');
const setReferral = async (req, res) => {
    try {
        const { userId, referralCode, commission } = req.body;
        if (!userId || (!referralCode && !commission)) {
            return res.status(400).json({
                message: 'Bad Request'
            })
        }

        const referral = await Referral.findOne({ userId: new ObjectId(userId) });
        const user = await User.findOne({ _id: new ObjectId(userId) })

        if (referralCode) {
            user.myReferralCode = referralCode;
            referral.referralCode = referralCode
        }

        if (commission) {
            if (commission < referral.commission)
                return res.status(400).json({ message: "Invalid Commission." });
            else
                referral.commission = commission;
        }

        await referral.save();
        await user.save();
        res.status(200).json({
            message: 'Referral updated'
        })
    }
    catch (error) {
        res.status(500).json({ msg: "Internal Server Error" })
    }
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
            commission: 1,
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

const getReferralPrize = async (invitedUserId, betAmount) => {
    const referral = await Referral.findOne({ "invitesList.invitedUserId": invitedUserId });
    if (!referral) {
        return;
    }
    const user = await User.findOne({ _id: referral.userId });
    await User.updateOne({ _id: invitedUserId }, { $set: { referralCode: referral.referralCode } })

    const checkUserLevel = () => {
        const bettingUsers = referral.invitesList.filter((i) => i.betAmount > 0);

        if (bettingUsers.length > 500) {
            if (referral.level == 3) {
                referral.level = 4;
                if (referral.commission <= 1.35) {
                    referral.commission = 1.35
                }
            }
        }
        if (bettingUsers.length > 250) {
            if (referral.level == 2) {
                referral.level = 3;
                if (referral.commission <= 1.0) {
                    referral.commission = 1.0
                }
            }
        }
        if (bettingUsers.length > 100) {
            if (referral.level == 1) {
                referral.level = 2;
                if (referral.commission <= 0.75) {
                    referral.commission = 0.75
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
    checkUserLevel();
    user.ETH_balance += betAmount * referral.commission * 0.01;

    let bonus = new Bonus({
        userId: user._id,
        invitedUserId: invitedUserId,
        date: Date.now(),
        amountWagered: betAmount,
        commission: betAmount * referral.commission * 0.01
    });

    await bonus.save();
    await referral.save();
    await user.save();
}

module.exports = { setReferral, getAllReferrals, getReferralPrize };