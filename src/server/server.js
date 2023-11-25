const Peer = require("../common/peer");
const net = require("net");
const messagesStrings = require('../common/messages');
const fs = require('fs');

module.exports = class Server extends Peer {
    constructor(port, status, fileAmount, maxSenders) {
        super(port, status, fileAmount);
        this.maxSenders = maxSenders;
        this.senderPeers = [];
    }

    initializeServer() {
        var self = this;
        super.initializeServer();
        this.app.get("/top-peers", function (req, res) {
            let senderPeers = [];
            if (self.senderPeers.length == 0) {
                senderPeers = [`${req.socket.address().address}:${self.port}`];
            } else {
                senderPeers = this.senderPeers;
            }
            res.send({ message: messagesStrings.SENDER_LIST, addresses: senderPeers });
        });

        // Post request for geetting input from 
        // the form 
        this.app.post("/transfer-complete", function (req, res) {
            console.log(req.body);
            this.senderPeers.push(`${req.connection.remoteAddress}:${req.connection.remotePort}`)
            res.send({ message: 'OK' });
        });
    }

}