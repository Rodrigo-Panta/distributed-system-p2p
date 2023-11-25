const express = require("express");
const fs = require('fs');

var path = require('path');

const messagesStrings = require('../common/messages');
const statusesStrings = require('../common/statuses');
const {
    generateKeyPair,
    encryptFileWithPublicKey,
    decryptFileWithPrivateKeyAndSymmetricKey,
    encryptWithSymmetricKey,
    decryptWithSymmetricKey
} = require('../criptography/criptography.js');

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
            https = require('node:https');
        } catch (err) {
            console.error('https support is disabled!');
        }

        this.app = express();

        const fs = require("fs");

        const bodyParser = require("body-parser");

        this.app.use(bodyParser.urlencoded({ extended: false }));
        this.app.use(bodyParser.json());

        this.app.get("/file", function (req, res) {
            if (self.status == statusesStrings.TRANSFER_COMPLETE) {
                let number = req.query.number;
                if (!number) {
                    res.send({ message: "No file number specified" });
                } else {
                    res.sendFile(path.join(__dirname + `/../../file/pdb_${number}.zip`));
                }
            } else {
                res.send({ message: "This peer's transfer is not complete yet" });
            }
        });

        this.app.post("/mssg", function (req, res) {

            console.log(req.body);

            res.redirect("/");
            req.end()

        });

        const options = {
            key: fs.readFileSync("server.key"),
            cert: fs.readFileSync("server.cert"),
        };

        let server = https.createServer(options, this.app)
            .listen(this.port, function (req, res) {
                console.log(`Server started at port ${self.port}`);
            });
    }
}
