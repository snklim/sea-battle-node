const http = require('http')
const express = require('express')
const WebSocket = require('ws')
const randomstring = require("randomstring");

const app = express()
const port = 8080

const server = http.createServer(app)

const webSocketServer = new WebSocket.Server({ server })

const amqp = require('amqplib/callback_api');

let callbacks = [];

let send = task => {
    console.log(task);
}

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
            var queuePong = `pong-${randomstring.generate(7)}`;

            channel.assertQueue(queuePing, {
                durable: false
            });

            channel.assertQueue(queuePong, {
                durable: false
            });

            send = task => {
                let taskId = callbacks.length;
                callbacks.push(task.callback);
                channel.sendToQueue(queuePing, Buffer.from(JSON.stringify({
                    taskId: taskId,
                    message: task.message,
                    callback: queuePong
                })));
            }

            channel.consume(queuePong, function (m) {
                try {
                    let msg = JSON.parse(m.content.toString());
                    let callback = callbacks[msg.taskId];

                    callback(msg.message);
                } catch (ex) {
                    console.log(ex)
                }
            }, {
                noAck: true
            })
        })
    })
}, 15000)

webSocketServer.on('connection', ws => {

    ws.on('message', m => {
        try {
            let msg = JSON.parse(m);

            send({
                message: msg,
                callback: m => {
                    ws.send(JSON.stringify(m));
                }
            });
        } catch (ex) {
            console.log(ex)
        }
    })

})

app.get('/api/', (req, res) => {
    send({
        message: {
            event: 'getgames',
            payload: {
                gameid: -1
            }
        },
        callback: m => {
            res.send(JSON.stringify(m))
        }
    });
})

app.get('/api/:gameid', (req, res) => {
    send({
        message: {
            event: 'getgames',
            payload: {
                gameid: Number.parseInt(eq.params.gameid)
            }
        },
        callback: m => {
            res.send(JSON.stringify(m))
        }
    });
})

server.listen(port, () => {
    console.log(`Example app listening at http://localhost:${port}`)
})