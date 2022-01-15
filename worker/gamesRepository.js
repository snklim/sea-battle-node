const GameDb = require('./models/gameDb')

class GamesRepository {
    //
    // ctor
    //
    constructor() {
        this.games = [];
    }

    save(id, game) {
        this.games.push(game)

        const gameDb = new GameDb({
            id: id,
            state: JSON.stringify(game)
        });

        gameDb.save();
    }

    async get(id) {
        const items = await GameDb.find({ id });
        if (items.length > 0) return JSON.parse(items[0].state);
        return null;
    }

    async getAll() {
        const items = await GameDb.find()
            .then(items => items.map(item => item.id))
            .catch(err => res.status(404).json({ msg: 'No items found' }));

        return items
    }

    async update(id, game) {
        GameDb.updateOne({ id }, { $set: { state: JSON.stringify(game) } });
    }
}

exports.GamesRepository = GamesRepository;