const Sport = require('../models/Sport');
const { ObjectId } = require("mongodb");

const getAllSports = async (req, res) => {
    try {
        const sports = await Sport.aggregate([
            {
                $lookup: {
                    from: 'props',
                    localField: '_id',
                    foreignField: 'sportId',
                    as: 'props',
                },
            },]);
        res.status(200).json(sports);
    } catch (error) {
        res.status(500).json(error);
    }
}

module.exports = { getAllSports };