const Bonus = require('../models/Bonus');
require('../utils/log');
const { ObjectId } = require("mongodb");

const getReferralBonusByReferralId = async (req, res) => {
    try {
        const page = parseInt(req.body.page) || 1;
        const limit = parseInt(req.body.limit) || 10;
        const userId = req.user.id;

        const bonus = await Bonus.find({ userId: new ObjectId(userId) });
        let total = 0

        bonus.forEach(item => {
            total += item.commission;
        })

        let count = bonus.length;

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
        results.results = await Bonus.find({ userId: new ObjectId(userId) }).skip(startIndex).limit(limit);
        results.totalCommission = total;
        res.json(results);
    } catch (error) {
        res.status(500).send('Server error');
    }
};

module.exports = {
    getReferralBonusByReferralId
}