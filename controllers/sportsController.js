const Sport = require('../models/Sport');
const { ObjectId } = require("mongodb");
require('../utils/log');
const getAllSports = async (req, res) => {
    try {
        let sports = await Sport.aggregate([
            {
                $lookup: {
                    from: 'props',
                    localField: '_id',
                    foreignField: 'sportId',
                    as: 'result'
                }
            },
            {
                $unwind: '$result'
            },
            {
                $match: {
                    'result.available': true
                }
            },
            {
                $group: {
                    _id: '$_id',
                    name: { $first: '$name' }, // replace 'name' with your other field names
                    props: {
                        $push: '$result'
                    }
                }
            },
        ]);
        sports = sports.filter(item => item.name !== "Soccer");

        res.status(200).json(sports);
    } catch (error) {
        console.log(error);
        res.status(500).send("Server Error");
    }
}

const addSport = async (req, res) => {
    try {
        const { name } = req.body;
        const sport = new Sport({
            name: name
        });
        await sport.save();
        res.json(sport);
    } catch (error) {
        res.status(500).send("Server Error");
    }
}

module.exports = { getAllSports, addSport };