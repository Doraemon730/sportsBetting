const Discount = require('../models/Discount')
const Player = require('../models/Player')
const Prop = require('../models/Prop')
require('../utils/log');
const { ObjectId } = require('mongodb')

const setDiscount = async (req, res) => {
    try {
        let { playerID, date, original, discount, propId } = req.body;
        const prop = await Prop.findOne({ _id: new ObjectId(propId) });
        if (!prop) {
            return res.status(404).send("Prop not found")
        }
        let propName = prop.displayName;
        console.log(date)
        date = new Date(date);
        date.setDate(date.getDate());
        date.setHours(0, 0, 0, 0);
        console.log(date)

        // Create date object for the next day
        let nextDate = new Date(date);
        nextDate.setDate(nextDate.getDate() + 1);
        console.log(nextDate)

        // Find documents where "date_field" is greater equal to your date and less than next day

        let data = await Discount.findOne({ playerId: new ObjectId(playerID), date: date, propId: prop._id });
        console.log(JSON.stringify(data))
        if (data) {
            data = await Discount.findOneAndUpdate({ playerId: new ObjectId(playerID) }, { $set: { date, original, discount } });
            return res.json(data);
        }
        let newData = new Discount({
            playerId: new ObjectId(playerID),
            date,
            original,
            discount,
            propId: new ObjectId(propId),
            propName
        });

        await newData.save();
        res.json(data);
    } catch (error) {
        console.log(error);
        res.status(500).send('Server error');
    }
}

module.exports = { setDiscount }

