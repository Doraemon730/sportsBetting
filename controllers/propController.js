const Prop = require('../models/Prop');
const { ObjectId } = require("mongodb");

const addProp = async (req, res) => {
    try {
        const {
            sportId,
            name,
            displayName
        } = req.body;
        const prop = new Prop({
            name,
            sportId: new ObjectId(sportId),
            displayName
        });
        await prop.save();
        res.status(200).json(prop);
    } catch (error) {
        res.status(500).json(error.message);
    }
}

const getPropsBySport = async (sportId) => {
    try {
        const props = await Prop.find({
            sportId: sportId
        });
        return props;
    } catch (error) {
        console.log(error.message);
    }
}

const getPropById = async (id) => {
    try {
        return await Prop.findById(id);
    } catch (err) {
        console.log("Error in getting the prop by id");
    }
}

const getProp = async (req, res) => {
    try {
        const promotion = await Promotion.findById(req.params.id);
        res.json(promotion);
    } catch (error) {
        res.status(500).json(error.message);
    }
}
const getProps = async (req, res) => {
    try {
        const props = await Prop.aggregate([{
                $lookup: {
                    from: 'sports', // The name of the Sport model collection
                    localField: 'sportId',
                    foreignField: '_id',
                    as: 'sport'
                }
            },
            {
                $unwind: '$sport'
            },
            {
                $group: {
                    _id: '$sportId',
                    sportName: {
                        $first: '$sport.name'
                    },
                    props: {
                        $push: '$$ROOT'
                    }
                }
            }
        ]);
        res.status(200).json(props);
    } catch (error) {
        res.status(500).json(error.message);
    }
}


module.exports = {
    addProp,
    getPropsBySport,
    getProps,
    getPropById,
    getProp
}