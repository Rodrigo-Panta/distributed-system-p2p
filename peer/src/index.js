//index.js
require("dotenv").config();

let port = process.env.PORT;
if (!port) {
    console.log('Variável de ambiente PORT não definida');
    process.exit(1);
}
console.log("Porta: ", port);


const Peer = require("../../common/peer");
const peer = new Peer(port);

if (process.argv.length != 3) {
    console.log('Nó servidor não definido');
    process.exit(1);
}

peer.connectTo(process.argv[2]);



