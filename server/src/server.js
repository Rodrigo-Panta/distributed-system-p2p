const Peer = require("../../common/peer");
const net = require("net");

module.exports = class Server extends Peer {
    constructor(port, data_pdb, data_trusted_peers) {
        super(port);
        // Essa é uma lista de Peers confiáveis que servirão como nós servidores caso o central caia.
        this.trustedPeers = [];
        this.data_pdb = data_pdb;
        this.data_trusted_peers = data_trusted_peers;
    }
    connectToTrustedPeer(address) {
        if (address.split(":").length !== 2)
            throw Error("O endereço do outro peer deve ser composto por host:port ");
        const [host, port] = address.split(":");
        const socket = net.createConnection({ port, host }, () => {
            this.onSocketConnected(socket);
            this.onTrustedPeerConected(socket);
        }
        );
    }

    onTrustedPeerConected(socket) {
        this.trustedPeers.push(socket);
        console.log(`Nó ${socket.address} adiconado à lista de nós confiáveis`);
        socket.write(JSON.stringify(this.data_trusted_peers));
        socket.write(JSON.stringify(this.data_pdb));
    }

    onData(socket, data) {
        console.log("received: ", data.toString())
    }

}