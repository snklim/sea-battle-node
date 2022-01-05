const GamesController = require('./gamesController.js').GamesController

var amqp = require('amqplib/callback_api');

const gamesController = new GamesController();

setTimeout(() => {
    amqp.connect('amqp://rabbitmq', function (error0, connection) {
        if (error0) {
            throw error0;
        }

        connection.createChannel(function (error1, channel) {
            if (error1) {
                throw error1;
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
                    sendFn(gamesController.hideGame(msg.payload.id >= 0
                        ? gamesController.getGame(msg.payload.id)
                        : gamesController.createGame()));
                }

                if (msg.event === 'move') {
                    var ctx = { playerChanged: false };

                    sendFn(gamesController.hideGame(gamesController.playGame(msg.payload, ctx)));

                    if (ctx.playerChanged)
                        setTimeout(() => {
                            gamesController.playBot(msg.payload, sendFn);
                        }, 500);
                }

                if (msg.event === 'getgames') {
                    if (msg.payload.gameid >= 0)
                        sendFn({ games: gamesController.getGames() })
                    else
                        sendFn({ games: gamesController.hideGame(gamesController.getGame(msg.payload.gameid)) })
                }

            }, {
                noAck: true
            })
        })
    })
}, 15000)