const Peer = require("../../common/peer");
const net = require("net");

module.exports = class Server extends Peer {
    constructor(port, data_pdb, data_trusted_peers, maxSenders) {
        super(port);
        // Essa é uma lista de Peers confiáveis que servirão como nós servidores caso o central caia.
        this.maxSenders = maxSenders;
        this.trustedPeers = [];
        this.dataPdb = data_pdb;
        this.dataTrustedPeers = data_trusted_peers;
        // Objeto para controlar os estados de cada conexão
        this.senderPeers = [];
    }

    addConnection(socket) {
        //TODO: implementar exclusão mutua
        //Designação de quem envia para o novo socket
        this.designateSenders(socket);
        this.connections.push({ socket: socket, transmissionsCount: -1 });
        console.log("Troca de chaves");
        //TODO: implementar troca de chaves
    }

    onData(socket, dataAsStream) {
        console.log("received: ", dataAsStream.toString())
        data = JSON.parse(dataAsStream);
        let message = data[message];
        switch (message) {
            case 'TransferComplete':
                let socketIsSender = this.senderPeers.some(item => item['address'] == data['address']);
                if (!socketIsSender) {
                    this.senderPeers.push({
                        address: data['address'],
                        currentTransfers: 0
                    });
                }
                this.updateSenderPeerTransfers(`${socket.address}:${socket.port}`, -1);
            case 'TransferInitiated':
                this.updateSenderPeerTransfers(`${socket.address}:${socket.port}`, 1);
            default:
                console.log(`Mensagem desconhecida recebida de ${socket.address}:${socket.port}. \nConteúdo: ${dataAsStream.toString()}`);
        }
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
        socket.write(JSON.stringify({ message: 'SendersList', addresses: senderAddresses }));

    }

    updateSenderPeerTransfers(address, amount) {
        this.senderPeers.find(item => item['address'] == address).currentTransfers += amount;
    }


}