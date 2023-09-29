const Promotion = require('../models/Promotion')
require('../utils/log');
const addPromotion = async (req, res) => {
    try {
        const { title, description, approach } = req.body;
        const promotion = new Promotion({ title, description, approach });
        await promotion.save();
        res.json(promotion);
    } catch (error) {
        res.status(500).send('Server error');
    }
}

const getPromotions = async (req, res) => {
    try {
        const promotions = await Promotion.find();
        res.json(promotions);
    } catch (error) {
        res.status(500).send('Server error');
    }
}

const getPromotion = async (req, res) => {
    try {
        const promotion = await Promotion.findById(req.params.id);
        res.json(promotion);
    } catch (error) {
        res.status(500).send('Server error');
    }
}

const updatePromotion = async (req, res) => {
    try {
        const { id, promotion } = req.body;
        const updatedpromotion = await Promotion.findByIdAndUpdate(id, promotion, { new: true });
        res.json(updatedpromotion);
    } catch (error) {
        res.status(500).send('Server error');
    }
}

const deletePromotion = async (req, res) => {
    try {
        const promotion = await Promotion.findByIdAndDelete(req.params.id);
        res.json(promotion);
    } catch (error) {
        res.status(500).send('Server error');
    }
}

module.exports = {
    addPromotion,
    getPromotions,
    getPromotion,
    updatePromotion,
    deletePromotion
};