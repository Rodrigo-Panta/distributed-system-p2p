const express = require("express");
const fs = require('fs');
const https = require('https');
var path = require('path');

const messagesStrings = require('../common/messages');
const statusesStrings = require('../common/statuses');

module.exports = class Peer {
    constructor(port, status, fileAmount) {
        this.port = port;
        this.status = status;
        this.successCount = 0;
        this.fileAmount = fileAmount;

        this.initializeServer(port);

    }

    initializeServer() {
        var self = this;
        let https;
        try {
            https = require('https');
        } catch (err) {
            console.error('https support is disabled!');
        }

        this.app = express();

        const bodyParser = require("body-parser");

        this.app.use(bodyParser.urlencoded({ extended: false }));
        this.app.use(bodyParser.json());

        this.app.get("/file", function (req, res) {
            if (self.status == statusesStrings.TRANSFER_COMPLETE) {
                let number = req.query.number;
                if (!number) {
                    res.send({ message: "No file number specified" });
                } else {
                    res.sendFile(path.join(__dirname, `../file/pdb_${number}.zip`));
                }
            } else {
                res.send({ message: "This peer's transfer is not complete yet" });
            }
        });

        const options = {
            key: fs.readFileSync("server.key"),
            cert: fs.readFileSync("server.cert"),
        };

        let server = https.createServer(options, this.app)
            .listen(this.port, '0.0.0.0', function (req, res) {
                console.log(`Server started at port ${self.port}`);
            });
    }
}
