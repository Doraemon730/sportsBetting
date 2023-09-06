const mongoose = require('mongoose');

const PlayerSchema = new mongoose.Schema({
  sportId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Sport',
    required: true
  },
  teamId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Team'
  },
  remoteId: {
    type: String,
    required: true
  },
  name: {
    type: String,
    required: true
  },
  position: String,
  age: Number,
  statistics: {
    minutes: Number,
    points: Number,
    off_rebounds: Number,
    def_rebounds: Number,
    rebounds: Number,
    assists: Number,
    steals: Number,
    blocks: Number,
    turnovers: Number,
    personal_fouls: Number,
    flagrant_fouls: Number,
    blocked_att:Number,
    field_goals_made: Number,
    field_goals_att: Number,
    three_points_made: Number,
    three_points_att: Number,
    free_throws_made: Number,
    free_throws_att: Number,
    two_points_made: Number,
    two_points_att: Number,
    efficiency: Number,
    true_shooting_att: Number,
    points_off_turnovers: Number,
    points_in_paint_made: Number,
    points_in_paint_att: Number,
    points_in_paint: Number,
    fouls_drawn: Number,
    offensive_fouls: Number,
    fast_break_pts: Number,
    fast_break_att: Number,
    fast_break_made: Number,
    second_chance_pts: Number,
    second_chance_att: Number,
    second_chance_made: Number
  }
});

module.exports = mongoose.model('player', PlayerSchema);
