const Event = require('../models/Event');
const Player = require('../models/Player');
const Prop = require('../models/Prop');
const Team = require('../models/Team');
const { ObjectId } = require("mongodb");
const {fetchWeeklyEventsNFL, fetchEventPlayerProps, fetchEventMapping, fetchWeeklyEventsMLB} = require('../services/eventService');

const getWeeklyEventsNFL = async (req, res) =>
{
    try {
        const mappings = await fetchEventMapping();
        if (!mappings || !Array.isArray(mappings)) return res.status(400).send({message: 'No events found'});
        //console.log(mappings);
        const events = await fetchWeeklyEventsNFL();
        for(const event of events){
            
            const myEvent = new Event({
                id: event.sport_event.id,
                startTime: event.sport_event.start_time,
                sportId: new ObjectId('650e0b6fb80ab879d1c142c8')                
            });
            let alias = [];
            for(const competitor of event.sport_event.competitors){
                const team = await Team.findOne({srId: competitor.id});
                competitor.teamId = team._id;                
                myEvent.competitors.push(competitor);
                alias.push(team.alias);
            }
            myEvent.name = alias[0] + " vs " + alias[1];
            
            const mapping = mappings.find(item=> item.id === event.sport_event.id);
            if(mapping)
                myEvent.matchId = mapping.external_id;
            await myEvent.save();

            const playerProps = await fetchEventPlayerProps(event.sport_event.id);
            //console.log(playerProps);

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

const getWeeklyEventsMLB = async (req, res) =>
{
    try {
        const mappings = await fetchEventMapping();
        if (!mappings || !Array.isArray(mappings)) return res.status(400).send({message: 'No events found'});
        //console.log(mappings);
        const events = await fetchWeeklyEventsMLB();
        for(const event of events){
            
            const myEvent = new Event({
                id: event.sport_event.id,
                startTime: event.sport_event.start_time,
                sportId: new ObjectId('65108fcf4fa2698548371fc0')                
            });
            let alias = [];
            for(const competitor of event.sport_event.competitors){
                const team = await Team.findOne({sportId: new ObjectId('65108fcf4fa2698548371fc0'),
                alias:competitor.abbreviation});                
                competitor.teamId = team._id;                
                myEvent.competitors.push(competitor);
                alias.push(team.alias);
            }
            myEvent.name = alias[0] + " vs " + alias[1];
            
            const mapping = mappings.find(item=> item.id === event.sport_event.id);
            if(mapping)
                myEvent.matchId = mapping.external_id;
            await myEvent.save();

            const playerProps = await fetchEventPlayerProps(event.sport_event.id);
            //console.log(playerProps);
            
            for(const playerProp of playerProps) {
                console.log(playerProp.player.id);
                console.log(playerProp.name);
                const player = await Player.findOne({srId: playerProp.player.id});
                if(!player)
                    continue;
                console.log(player);
                for(const market of playerProp.markets) {
                    const prop = await Prop.findOne({srId: market.id});
                    if(!prop) continue;
                    const index = player.odds.findIndex((odd) => odd.id === prop.id);
                    console.log(market);
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
            //console.log(playerProps);

        }
        res.json(events);
    } catch (error) {
        console.log(error.message);
        res.json(error.message);
    }
};
const remove = async (req, res) => {
    try{
        await Event.deleteMany({sportId:new ObjectId('65108fcf4fa2698548371fc0')});
        res.json("Success");
    } catch(error) {
        res.status(500).send("Server Error");
    }
};
module.exports = {
    getWeeklyEventsNFL,
    getWeeklyEventsMLB,
    remove
}