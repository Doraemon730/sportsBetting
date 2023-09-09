const Promotion = require('../models/Promotion')

const addPromotion = async (req, res) => {
    try {
        const {title, description, approach} = req.body;
        const promotion = new Promotion({title, description, approach});
        await promotion.save();
        res.json(promotion);
    } catch (error) {
        res.status(500).json(error.message);
    }
}

const getPromotions = async (req, res) => {
    try {
        const promotions = await Promotion.find();
        res.json(promotions);
    } catch (error) {
        res.status(500).json(error.message);
    }
}

const getPromotion = async (req, res) => {
    try {
        const promotion = await Promotion.findById(req.params.id);
        res.json(promotion);
    } catch (error) {
        res.status(500).json(error.message);
    }
}

const updatePromotion = async (req, res) => {
    try {
        const promotion = await Promotion.findByIdAndUpdate(req.params.id, req.body, {new: true});
        res.json(promotion);
    } catch (error) {
        res.status(500).json(error.message);
    }
}

const deletePromotion = async (req, res) => {
    try {
        const promotion = await Promotion.findByIdAndDelete(req.params.id);
        res.json(promotion);
    } catch (error) {
        res.status(500).json(error.message);
    }
}

module.exports = {
    addPromotion,
    getPromotions,
    getPromotion,
    updatePromotion,
    deletePromotion
};