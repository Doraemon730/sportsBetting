const Statistics = require('../models/Statistics');

const updateTotal = async () => {
    try {
        const now = new Date();
        now.setUTCHours(0, 0, 0, 0);
        const statistic = await Statistics.findOne({}, {}, {
            sort: {
                _id: -1
            }
        });
        if (now.getDate() === statistic.date.getDate()) {
            statistic.total_users++;
            statistic.daily_users++;
            await statistic.save();
        } else {
            const newstatistic = new Statistics({
                date: now,
                total_users: statistic.total_users + 1,
                daily_users: 1
            });
            await newstatistic.save();
        }

    } catch (error) {
        console.log(error.message);
    }
}

const getStatisticsByDate = async (date) => {
    try {
        date.setUTCHours(0, 0, 0, 0);        
        console.log(date);
        const statistics = await Statistics.findOne({
            date: date
        });
        return statistics;
    } catch (error) {
        console.log(error.message);
    }
}

const getStatistics = async (req, res) => {
    try {
        console.log("asdf");
        let {
            date
        } = req.body;
        if (!date)
            date = new Date();
        console.log(date);
        const statistics = await getStatisticsByDate(date);

        res.json(statistics);
    } catch (error) {
        console.log(error.message);
        res.status(500).json(error.message);
    }
}



module.exports = {
    getStatistics,
    updateTotal
}