const Peer = require("../common/peer");
const net = require("net");
const messagesStrings = require('../common/messages');

module.exports = class Server extends Peer {
    constructor(port, maxSenders) {
        super(port);
        this.maxSenders = maxSenders;
        this.trustedPeers = [];
        // Objeto para controlar os estados de cada conexão
        this.senderPeers = [];
    }

    addConnection(socket) {
        //TODO: implementar exclusão mutua
        //Designação de quem envia para o novo socket
        //TODO: implementar troca de chaves
        super.addConnection(socket);
        console.log("Troca de chaves");
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
            case messagesStrings.GET_PDB_FILES:
                this.sendPDBFile(socket, data['index']);
                break;
            case messagesStrings.PUBLIC_KEY:
                this.onPublicKeyReceived(socket, data.publicKey);
                this.sendTopPeersOrStream(socket);
                break;
            default:
                console.log(`Mensagem desconhecida recebida de ${socket.address}:${socket.port}. \nConteúdo: ${dataAsStream.toString()}`);
        }
    }

    sendTopPeersOrStream(socket) {
        // Manda para o nó recem conectado uma lista de nó que podem lhe enviar o arquivo 
        let sendersCount = this.senderPeers.length;
        let senderAddresses = [];
        if (sendersCount == 0) {
            this.sendPDBFile(socket, 1);
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
}