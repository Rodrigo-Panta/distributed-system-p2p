//index.js
require("dotenv").config();
const statusesStrings = require('../common/statuses');


// let port = process.env.PORT;
port = '30' + (Math.floor(Math.random() * 89) + 10).toString();

if (!port) {
    console.log('Variável de ambiente PORT não definida');
    process.exit(1);
}
console.log("Porta: ", port);


const Peer = require("../common/peer");
const peer = new Peer(process.env.USERNAME, port, statusesStrings.UNCONNECTED, 13);
if (process.argv.length != 3) {
    console.log('Nó servidor não definido');
    process.exit(1);
}

peer.connectTo(process.argv[2]);



