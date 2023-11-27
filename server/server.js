const Peer = require("./common/peer");
const messagesStrings = require('./common/messages');
const fs = require('fs');

module.exports = class Server extends Peer {
    constructor(port, status, fileAmount, maxSenders) {
        super(port, status, fileAmount);
        this.maxSenders = maxSenders;
        this.senderPeers = {};
    }

    initializeServer() {
        var self = this;
        super.initializeServer();

        this.app.get("/top-peers", function (req, res) {
            let topPeers = [];
            if (Object.entries(self.senderPeers).length == 0) {
                if (req.socket.address().family == 'IPv4') {
                    topPeers.push(`${req.socket.address().address}:${self.port}`);
                }
                else if (req.socket.address().family == 'IPv6') {
                    topPeers.push(`[${req.socket.address().address}]:${self.port}`);
                }
                res.send({ message: messagesStrings.SENDER_LIST, addresses: topPeers });
            } else {
                for (const [key, value] of Object.entries(self.senderPeers)) {
                    if (Math.random() > 0.5) {
                        topPeers.push(key);
                    } else {
                        topPeers.splice(0, 0, key);
                    }

                }

                res.send({ message: messagesStrings.SENDER_LIST, addresses: topPeers });
            }

        });

        // Post request for geetting input from 
        // the form 
        this.app.post("/transfer-complete", function (req, res) {
            console.log(req.body);
            if (req.socket.remoteFamily == 'IPv4') {
                self.senderPeers[`${req.socket.remoteAddress}:${req.body['port']}`] = { transfers: 0 };
            }
            else if (req.socket.remoteFamily == 'IPv6') {
                self.senderPeers[`${req.socket.remoteAddress}]:${req.body['port']}`] = { transfers: 0 };
            }

            console.log(`${req.socket.remoteAddress}:${req.body['port']} agora e um sender`);
            res.send({ message: 'OK' });
        });
    }

}