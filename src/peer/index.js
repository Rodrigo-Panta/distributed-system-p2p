//index.js
const { getTopPeers } = require('../common/promisses');
const https = require('https');
const fs = require('fs');
require("dotenv").config();
const statusesStrings = require('../common/statuses');

// let port = process.env.PORT;
port = '30' + (Math.floor(Math.random() * 89) + 10).toString();

if (!port) {
    console.log('Variável de ambiente PORT não definida');
    process.exit(1);
}
console.log("Porta: ", port);

const fileAmount = 13;

const Peer = require("../common/peer");
const peer = new Peer(port, statusesStrings.WAITING_PDB, fileAmount);

if (process.argv.length != 3) {
    console.log('Nó servidor não definido');
    process.exit(1);
}

let serverAddress = process.argv[2];

async function main() {
    let topPeers = await getTopPeers(serverAddress);
    try {
        while (peer.successCount < fileAmount) {
            let senderPeer = topPeers.pop();
            if (senderPeer) {
                getPdbFiles(peer, topPeers);
            } else {
                topPeers = await _getTopPeers(serverAddress);
            }
        }
    } catch (e) {
        console.error('Erro ao baixar os arquivos PDB');
        console.error(e.message);
    }
}

main();


