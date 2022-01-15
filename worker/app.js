const GamesController = require('./gamesController.js').GamesController;
const mongoose = require('mongoose');

mongoose.connect('mongodb://mongo:27017/games')
    .then(() => console.log('MongoDB Connected'))
    .catch(err => console.log(err));

var amqp = require('amqplib/callback_api');

const gamesController = new GamesController();

const connect = () => setTimeout(() => {

    console.log('Connecting...')

    amqp.connect('amqp://rabbitmq', function (error0, connection) {
        if (error0) {
            connect()
            return
        }

        connection.createChannel(function (error1, channel) {
            if (error1) {
                connect()
                return
            }

            var queuePing = 'ping';

            channel.assertQueue(queuePing, {
                durable: false
            });

            const send = (msg, taskId, callback) => {
                channel.sendToQueue(callback, Buffer.from(JSON.stringify({
                    taskId: taskId,
                    message: msg
                })));
            }

            channel.consume(queuePing, function (m) {

                let task = JSON.parse(m.content.toString());
                let taskId = task.taskId;
                let callback = task.callback;
                let msg = task.message;

                let sendFn = m => send(m, taskId, callback);

                if (msg.event === 'start') {
                    if (msg.payload.id) {
                        gamesController.getGame(msg.payload.id)
                            .then(game => sendFn(game));
                    } else {
                        gamesController.createGame()
                            .then(game => sendFn(game));
                    }
                }

                if (msg.event === 'move') {
                    gamesController.playGame(msg.payload, sendFn);
                }

                if (msg.event === 'getgames') {
                    if (msg.payload.gameid >= 0)
                        sendFn({ games: gamesController.hideGame(gamesController.getGame(msg.payload.gameid)) })
                    else
                        gamesController.getGames().then(games => sendFn({ games }))

                }

            }, {
                noAck: true
            })
        })
    });
}, 1000);

connect();