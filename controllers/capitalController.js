const Capital = require('../models/Capital');
require('../utils/log');

const updateDeposit = async (amount) => {
    try {
        const capital = await Capital.findOne({}, {}, {
            sort: {
                _id: -1
            }
        });
        const now = new Date();
        now.setMinutes(0, 0, 0);
        const created = capital.createdAt;
        created.setMinutes(0, 0, 0);
        if (now.getDate() === created.getDate() && now.getHours() === created.getHours()) {
            capital.total += amount;
            capital.deposit += amount;
            capital.createdAt = now;
            await capital.save();
        } else {
            const newcap = new Capital({
                total: capital.total + amount,
                deposit: capital.deposit + amount,
                withdraw: capital.withdraw,
                profit: capital.profit,
                lost: capital.lost,
                createdAt: now,
            });
            await newcap.save();
        }
    } catch (error) {
        console.log(error);
    }
}

const updateWithdraw = async (amount) => {
    try {
        const capital = await Capital.findOne({}, {}, {
            sort: {
                _id: -1
            }
        });
        const now = new Date();
        now.setMinutes(0, 0, 0);
        const created = capital.createdAt;
        created.setMinutes(0, 0, 0);
        if (now.getDate() === created.getDate() && now.getHours() === created.getHours()) {
            capital.total -= amount;
            capital.withdraw += amount;
            capital.createdAt = now;
            await capital.save();
        } else {
            const newcap = new Capital({
                total: capital.total - amount,
                deposit: capital.deposit,
                withdraw: capital.withdraw + amount,
                profit: capital.profit,
                lost: capital.lost,
                createdAt: now,
            });
            await newcap.save();
        }
    } catch (error) {
        console.log(error);
    }
}

const updateProfit = async (amount) => {
    try {
        const capital = await Capital.findOne({}, {}, {
            sort: {
                _id: -1
            }
        });
        const now = new Date();
        now.setMinutes(0, 0, 0);
        const created = capital.createdAt;
        created.setMinutes(0, 0, 0);
        if (now.getDate() === created.getDate() && now.getHours() === created.getHours()) {
            capital.profit += amount;
            capital.createdAt = now;
            await capital.save();
        } else {
            const newcap = new Capital({
                total: capital.total,
                deposit: capital.deposit,
                withdraw: capital.withdraw,
                profit: capital.profit + amount,
                lost: capital.lost,
                createdAt: now,
            });
            await newcap.save();
        }
    } catch (error) {
        console.log(error);
    }
}
const updateLost = async (amount) => {
    try {
        const capital = await Capital.findOne({}, {}, {
            sort: {
                _id: -1
            }
        });
        const now = new Date();
        now.setMinutes(0, 0, 0);
        const created = capital.createdAt;
        created.setMinutes(0, 0, 0);
        if (now.getDate() === created.getDate() && now.getHours() === created.getHours()) {
            capital.lost += amount;
            capital.createdAt = now;
            await capital.save();
        } else {
            const newcap = new Capital({
                total: capital.total,
                deposit: capital.deposit,
                withdraw: capital.withdraw,
                profit: capital.profit,
                lost: capital.lost - amount,
                createdAt: now,
            });
            await newcap.save();
        }
    } catch (error) {
        console.log(error);
    }
}
const updateCapital = async (type, amount) => {
    try {
        switch (type) {
            case 0:
                await updateDeposit(amount);
                break;
            case 1:
                await updateWithdraw(amount);
                break;
            case 2:
                await updateProfit(amount);
                break;
            case 3:
                await updateLost(amount);
                break;
        }
    } catch (error) {
        console.log(error);
    }
}

const addCapital = async (req, res) => {
    try {
        const now = new Date();
        now.setMinutes(0, 0, 0);
        const capital = new Capital({
            total: 10,
            deposit: 0,
            withdraw: 0,
            profit: 0,
            lost: 0,
            createdAt: now
        });
        await capital.save();
        res.json(capital);
    } catch (error) {
        res.status(500).send('Server error');
    }
}
const getCaptital = async (req, res) => {
    try {
        const capital = await Capital.findOne({}, {}, {
            sort: {
                _id: -1
            }
        });
        res.json(capital);
    } catch (error) {
        res.status(500).send('Server error');
    }
}
module.exports = {
    updateCapital,
    addCapital,
    getCaptital
}