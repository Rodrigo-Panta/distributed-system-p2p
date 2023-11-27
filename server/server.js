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
            let senderPeers = {};
            if (self.senderPeers.length == 0) {
                if (req.socket.address().family == 'IPv4') {
                    senderPeers[`${req.socket.address().address}:${self.port}`] = { transfers: 0 };
                }
                else if (req.socket.address().family == 'IPv6') {
                    senderPeers[`[${req.socket.address().address}]:${self.port}`] = { transfers: 0 };
                }
                res.send({ message: messagesStrings.SENDER_LIST, addresses: senderPeers });
            } else {
                senderPeers = self.senderPeers;
                const sortedPeers = Object.entries(self.senderPeers)
                .sort(([, a], [, b]) => a.transfers - b.transfers)
                .reduce((acc, [key, value]) => ({ ...acc, [key]: value }), {});
                res.send({ message: messagesStrings.SENDER_LIST, addresses: sortedPeers });
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
                self.senderPeers`[${req.socket.remoteAddress}]:${req.body['port']}` = { transfers: 0 };
            }

            console.log(`${req.socket.remoteAddress}:${req.body['port']} agora e um sender`);
            res.send({ message: 'OK' });
        });
    }

}