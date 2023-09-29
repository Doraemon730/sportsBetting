require('../utils/log');
const checkWednesday = (req, res, next) => {
    const today = new Date();
    const dayOfWeek = today.getDay();
    if (dayOfWeek !== 3) {
        return res.status(403).json({
            message: 'Today, the option to place a six-leg parlay is not available. Kindly attempt again on Wednesday.'
        });
    }
    next();
}
const checkFriday = (req, res, next) => {
    const today = new Date();
    const dayOfWeek = today.getDay();
    if (dayOfWeek !== 5) {
        return res.status(403).json({
            message: 'Today, the option to place a "Friday Four" is not available. Kindly attempt again on Friday.'
        });
    }
    next();
}

module.exports = { checkWednesday, checkFriday }