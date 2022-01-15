const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const GameDbSchema = new Schema({
    id: {
        type: String,
        require: true
    },
    state: {
        type: String,
        require: true
    }
})

module.exports = GameDb = mongoose.model('gamedb', GameDbSchema);