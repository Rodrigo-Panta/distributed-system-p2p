//index.js
require("dotenv").config();

let port = process.env.PORT;
if (!port) {
    console.log('Variável de ambiente PORT não definida');
    process.exit(1);
}

console.log("Porta: ", port);

const Server = require("./server");
const server = new Server(port, 10, 13);

console.log(process.argv.length);

process.argv.slice(2).forEach(async otherPeerAddress => {
    server.connectToTrustedPeer(otherPeerAddress)
    data_trusted_peers.addresses.push(otherPeerAddress);
});



