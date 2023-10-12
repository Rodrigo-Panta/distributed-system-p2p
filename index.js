//index.js
const port = process.argv[2];
console.log("Porta: ", port);

const Peer = require("./peer");
const peer = new Peer(port);


process.argv.slice(3).forEach(otherPeerAddress =>
    peer.connectTo(otherPeerAddress)
);

