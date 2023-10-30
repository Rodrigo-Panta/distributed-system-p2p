//index.js
require("dotenv").config();

let data_pdb = {
    pdb1: "PDBFILE1",
    pdb2: "PDBFILE2",
    pdb3: "PDBFILE3",
    pdb4: "PDBFILE4",
};
let data_trusted_peers = {
    addresses: [],
};

let port = process.env.PORT;
if (!port) {
    console.log('Variável de ambiente PORT não definida');
    process.exit(1);
}

console.log("Porta: ", port);

const Server = require("./server");
const server = new Server(port, data_pdb, data_trusted_peers, 10);

console.log(process.argv.length);

if (process.argv.length <= 2) {
    console.log('Nenhum nó secundário confiável definido');
}
process.argv.slice(2).forEach(async otherPeerAddress => {
    server.connectToTrustedPeer(otherPeerAddress)
    data_trusted_peers.addresses.push(otherPeerAddress);
});



