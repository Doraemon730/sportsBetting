const Event = require('../models/Event');
const Player = require('../models/Player');
const Prop = require('../models/Prop');
const Team = require('../models/Team');
const {fetchWeeklyEvents, fetchEventPlayerProps} = require('../services/eventService');

const getWeeklyEvents = async (req, res) =>
{
    try {
        const events = await fetchWeeklyEvents();
        for(const event of events){
            
            const myEvent = new Event({
                id: event.sport_event.id,
                startTime: event.sport_event.start_time,                
            });
            let alias = [];
            for(const competitor of event.sport_event.competitors){
                const team = await Team.findOne({srId: competitor.id});
                competitor.teamId = team._id;                
                myEvent.competitors.push(competitor);
                alias.push(team.alias);
            }
            myEvent.name = alias[0] + " vs " + alias[1];
            await myEvent.save();

            
            const playerProps = await fetchEventPlayerProps(event.sport_event.id);
            console.log(playerProps);

            for(const playerProp of playerProps) {
                //console.log(playerProp.player.id);
                const player = await Player.findOne({srId: playerProp.player.id});
                if(!player)
                    continue;
                for(const market of playerProp.markets) {
                    const prop = await Prop.findOne({srId: market.id});
                    if(!player || !prop) continue;
                    const index = player.odds.findIndex((odd) => odd.id === prop.id);
                    //console.log(market);
                    if( index !== -1){
                        player.odds[index].value = market.books[0].outcomes[0].open_total;
                        player.odds[index].event = myEvent._id;
                    } else {
                        player.odds.push({
                            id:prop._id,
                            value: market.books[0].outcomes[0].open_total,
                            event: myEvent._id
                        });
                    }
                }
                await player.save();
            }
            console.log(playerProps);

        }
        res.json(events);
    } catch (error) {
        console.log(error.message);
        res.json(error.message);
    }
}

module.exports = {
    getWeeklyEvents,
}