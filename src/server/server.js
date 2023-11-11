const Peer = require("../common/peer");
const net = require("net");
const messagesStrings = require('../common/messages');

module.exports = class Server extends Peer {
    constructor(port, dataPdb, data_trusted_peers, maxSenders) {
        super(port, dataPdb);
        // Essa é uma lista de Peers confiáveis que servirão como nós servidores caso o central caia.
        this.maxSenders = maxSenders;
        this.trustedPeers = [];
        this.dataTrustedPeers = data_trusted_peers;
        // Objeto para controlar os estados de cada conexão
        this.senderPeers = [];
    }

    addConnection(socket) {
        //TODO: implementar exclusão mutua
        //Designação de quem envia para o novo socket
        this.designateSenders(socket);
        this.connections.push({ socket: socket });
        console.log("Troca de chaves");
        //TODO: implementar troca de chaves
    }

    onData(socket, dataAsStream) {
        console.log("received: ", dataAsStream.toString())
        let data = JSON.parse(dataAsStream);
        let message = data['message'];
        switch (message) {
            case messagesStrings.TRANSFER_COMPLETE:
                let socketIsSender = this.senderPeers.some(item => item['address'] == data['address']);
                if (!socketIsSender) {
                    this.senderPeers.push({
                        address: data['address'],
                        currentTransfers: 0
                    });
                }
                this.updateSenderPeerTransfers(`${socket.address}:${socket.port}`, -1);
                break;
            case messagesStrings.TRANSFER_INITIATED:
                this.updateSenderPeerTransfers(`${socket.address}:${socket.port}`, 1);
                break;
            default:
                console.log(`Mensagem desconhecida recebida de ${socket.address}:${socket.port}. \nConteúdo: ${dataAsStream.toString()}`);
        }
    }

    designateSenders(socket) {
        // Manda para o nó recem conectado uma lista de nó que podem lhe enviar o arquivo 
        let sendersCount = this.senderPeers.length;
        let senderAddresses = [];
        if (sendersCount == 0) {
            this.sendPDBFile(socket);
            return;
        }
        for (let i in Math.min(this.maxSenders, sendersCount)) {
            senderAddresses.push(this.senderPeers[i]['address']);
        }
        socket.write(JSON.stringify({ message: messagesStrings.SENDER_LIST, addresses: senderAddresses }));

    }

    updateSenderPeerTransfers(address, amount) {
        this.senderPeers.find(item => item['address'] == address).currentTransfers += amount;
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
        socket.write(JSON.stringify(this.dataTrustedPeers));
        socket.write(JSON.stringify(this.dataPdb));
    }



}