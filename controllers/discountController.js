const Discount = require('../models/Discount')
const Player = require('../models/Player')

const { ObjectId } = require('mongodb')

const setDiscount = async (req, res) => {
    try {
        let { playerId, date, original, discount, propId } = req.body;
        date = new Date(date);
        date.setUTCHours(0, 0, 0, 0);
        const data = new Discount({
            playerId: new ObjectId(playerId),
            date,
            original,
            discount,
            propId: new ObjectId(propId)
        });

        await data.save();
        res.json(data);
    } catch (error) {
        console.log(error)
        res.status(500).send('Server error');
    }
}

module.exports = { setDiscount }

