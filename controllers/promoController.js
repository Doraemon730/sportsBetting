const Promo = require('../models/Promo')
const Event = require('../models/Event')
require('../utils/log');

const addPromo = async (req, res) => {
    const { entryFee, betType, picks } = req.body;

    const jsonArray = JSON.parse(picks);
    let firstMatchTime;
    for (const element of jsonArray) {
        let event = await Event.findOne({ _id: new ObjectId(element.contestId) })
        if (firstMatchTime == undefined || event.startTime < firstMatchTime)
            firstMatchTime = event.startTime;
    }

    let promo = new Promo({
        entryFee,
        betType,
        picks: jsonArray,
        firstMatchTime
    });
    await promo.save();
    return res.json(promo)
}

const updatePromo = async (req, res) => {
    const { id, entryFee, betType, picks } = req.body;

    const jsonArray = JSON.parse(picks);
    let firstMatchTime;
    for (const element of jsonArray) {
        let event = await Event.findOne({ _id: new ObjectId(element.contestId) })
        if (firstMatchTime == undefined || event.startTime < firstMatchTime)
            firstMatchTime = event.startTime;
    }

    const promo = await Promotion.updateOne({
        _id: new ObjectId(id)
    }, {
        $set: {
            entryFee,
            betType,
            picks: jsonArray,
            firstMatchTime
        }
    })

    return res.json(promo);

}

const deletePromo = async (req, res) => {
    const { id } = req.body;
    await Promo.deleteOne({ _id: new ObjectId(id) });
    return res.json("success");
}

const getAvailablePromos = async (req, res) => {

    const promos = await Promo.find({
        firstMatchTime: {
            $gte: new Date(),
        }
    })

    return res.json(promos)
}

module.exports = {
    addPromo,
    updatePromo,
    deletePromo,
    getAvailablePromos
};