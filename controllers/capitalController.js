const Capital = require('../models/Capital');


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
        if (now == created) {
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
        console.log(error.message);
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
        if (now == created) {
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
        console.log(error.message);
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
        if (now == created) {            
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
        console.log(error.message);
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
        if (now == created) {            
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
        console.log(error.message);
    }
}
const updateCapital = async (type, amount) => {
    try {
        switch(type) {
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
        console.log(error.message);
    }
}

const addCapital = async (req, res) => {
    try {
        const now = new Date();
        now.setMinutes(0, 0, 0);
        const capital = new Capital({
            total:10,
            deposit:0,
            withdraw:0,
            profit:0,
            lost:0,
            createdAt:now
        });
        await capital.save();
        res.json(capital);
    } catch (error) {
        res.status(500).json(error.message);
    }
}

module.exports = {
    updateCapital,
    addCapital
}