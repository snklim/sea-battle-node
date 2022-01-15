const GamesRepository = require('./gamesRepository.js').GamesRepository
const uuid = require('uuid')

class GamesController {

    //
    // ctor
    //
    constructor() {
        this.repo = new GamesRepository();
    }

    //
    // get games
    //
    async getGames() {
        return await this.repo.getAll();
    }

    //
    // get game
    //
    async getGame(index) {
        const game = await this.repo.get(index);
        return this.hideGame(game);
    }

    //
    // play bot
    //
    async playBot(move, send) {
        let game = await this.repo.get(move.game);
        let field = game[game.target];
        let cells = field.cells;
        let availableCells = [];
        let next = field.next;
        let newNext = [];

        if (game.field1.shipsAlive === 0 || game.field2.shipsAlive === 0) return;

        cells.forEach(cell => {
            if (cell.type !== 'killed' && cell.type !== 'missed') {
                availableCells.push(cell.index);
            }
        });

        next.forEach(index => {
            if (cells[index].type !== 'killed' && cells[index].type !== 'missed') {
                newNext.push(index)
            }
        })

        let targetCell = availableCells[Math.floor(availableCells.length * Math.random())];

        if (newNext.length > 0) {
            targetCell = newNext[Math.floor(newNext.length * Math.random())]
        }

        await this.playGame({ game: move.game, index: targetCell, target: 'field1' }, send);
    }

    //
    // hide game
    //
    hideGame(game) {
        let gameOver = game.field1.shipsAlive === 0 || game.field2.shipsAlive === 0;
        return {
            event: 'update',
            payload: {
                fields: [this.hideCells(game.field1, true, 'field1'), this.hideCells(game.field2, gameOver, 'field2')],
                message: game.field1.shipsAlive > 0 && game.field2.shipsAlive > 0 ? `${game.field1.shipsAlive} vs ${game.field2.shipsAlive}` :
                    game.field1.shipsAlive === 0 ? 'Loose' : 'Win'
            }
        };
    }

    //
    // hide cells
    //
    hideCells(field, show, target) {
        let cells = [];

        field.cells.forEach(cell => {
            cells.push({
                game: cell.game,
                index: cell.index,
                type: show || cell.type === 'killed' || cell.type === 'missed' ? cell.type : 'empty',
                target,
                enemy: !show
            })
        })

        return cells;
    }

    //
    // play game
    //
    async playGame(move, send) {
        let game = await this.repo.get(move.game);
        let field = game[game.target];
        let cells = field.cells;
        let cell = cells[move.index];

        if (cell.type === 'killed' || cell.type === 'missed' || move.target !== game.target) {
            return game;
        }

        cell.type = cell.type === 'ship' ? 'killed' : 'missed';

        if (cell.type === 'killed') {
            let ship = field.ships[cell.ship];
            let border = field.borders[cell.border];
            let prev = field.prev;
            let next = field.next;

            prev.push(cell.index);

            // find possible next targes as neighbors of killed cell
            [
                { x: cell.x - 1, y: cell.y },
                { x: cell.x, y: cell.y + 1 },
                { x: cell.x + 1, y: cell.y },
                { x: cell.x, y: cell.y - 1 }
            ].forEach(t => {
                var target = cells.find(c => c.x === t.x && c.y === t.y);
                if (target && target.type !== 'killed' && target.type !== 'missed') {
                    next.push(target.index);
                }
            })

            // if there are two killed cells then clean other possible target which are not on the same line
            if (prev.length > 1) {
                let p1 = cells[prev[0]];
                let p2 = cells[prev[1]];
                let f1 = p1.x === p2.x;
                let f2 = p1.y === p2.y;
                let newNext = [];
                next.forEach(n => {
                    var target = cells[n]
                    if (f1 && target.x === p1.x || f2 && target.y === p1.y) {
                        newNext.push(target.index)
                    }
                });
                next.length = 0;
                newNext.forEach(n => next.push(n))
            }

            var destroyed = true;

            // if there is one cell left as not killed then the ship is not destroyed
            ship.forEach(index => {
                if (cells[index].type === 'ship') {
                    destroyed = false;
                }
            })

            // if ship is destroyed then decrease the number of alive ships
            if (destroyed) {
                prev.length = 0;
                next.length = 0;
                border.forEach(index => {
                    cells[index].type = 'missed';
                })
                field.shipsAlive -= 1;
            }
        } else {
            game.target = game.target === 'field1' ? 'field2' : 'field1';
        }

        if (game.target === 'field1') {
            setTimeout(() => {
                this.playBot(move, send)
            }, 1000);
        }

        await this.repo.update(move.game, game)

        send(this.hideGame(game));
    }

    //
    // create game
    //
    async createGame() {
        let id = uuid.v1();
        let game = { field1: this.createField(id), field2: this.createField(id), target: 'field2' };
        await this.repo.save(id, game);
        return this.hideGame(game);
    }

    //
    // create field
    //
    createField(id) {
        let cells = [];
        let borders = [];
        let ships = [];
        let shipsToPlace = [4, 3, 3, 2, 2, 2, 1, 1, 1, 1];

        for (let i = 0; i < 100; i++) {
            cells.push({
                game: id,
                border: 0,
                ship: 0,
                index: i,
                x: Math.floor(i / 10),
                y: i % 10,
                type: 'empty'
            });
        }

        shipsToPlace.forEach(length => {
            let availableCells = cells.filter(x => x.type === 'empty');

            while (true) {
                let availableCell = availableCells[Math.floor(availableCells.length * Math.random())];
                let horizontal = Math.floor(availableCells.length * Math.random()) % 2 === 0;

                let x = availableCell.x;
                let y = availableCell.y;

                let incrementX = horizontal ? 1 : 0;
                let incrementY = horizontal ? 0 : 1;

                let ship = [];
                let border = [];

                for (let k = 0; k < length; k++) {
                    ship.push({ index: x * 10 + y, x, y, valid: x < 10 && y < 10 });

                    for (let i = x - 1; i < x + 2; i++) {
                        for (let j = y - 1; j < y + 2; j++) {
                            if (0 <= i && i < 10 && 0 <= j && j < 10)
                                border.push({ index: i * 10 + j, x: i, y: j, valid: i < 10 && j < 10 });
                        }
                    }

                    x += incrementX;
                    y += incrementY;
                }

                let valid = true;

                if (valid) {
                    ship.forEach(position => {
                        try {
                            if (!position.valid || cells[position.index].type !== 'empty') {
                                valid = false;
                            }
                        } catch (ex) {
                            console.log('ship', position);
                        }
                    })
                }

                if (valid) {
                    let borderIndex = borders.length;
                    let shipIndex = ships.length;

                    borders.push([]);
                    ships.push([]);

                    ship.forEach(position => {
                        cells[position.index].border = borderIndex;
                        cells[position.index].ship = shipIndex;
                        cells[position.index].type = 'ship'
                        ships[shipIndex].push(position.index);
                    });

                    border.forEach(position => {
                        if (ships[shipIndex].indexOf(position.index) === -1) {
                            cells[position.index].type = 'border'
                            borders[borderIndex].push(position.index);
                        }
                    });

                    break;
                }
            }
        });

        return { cells, borders, ships, prev: [], next: [], shipsAlive: shipsToPlace.length };
    }
}

exports.GamesController = GamesController;