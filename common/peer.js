const net = require("net");
const messagesStrings = require('../common/messages');

module.exports = class Peer {
    constructor(port) {
        this.port = port;
        this.connections = [];
        const server = net.createServer(
            (socket) => {
                this.onSocketConnected(socket)
            }
        );
        server.listen(port, () => console.log("Ouvindo porta " + port))
    }

    connectTo(address) {
        if (address.split(":").length !== 2)
            throw Error("O endereço do outro peer deve ser composto por host:port ");
        const [host, port] = address.split(":");
        const socket = net.createConnection({ port, host }, () =>
            this.onSocketConnected(socket)
        );
    }

    onSocketConnected(socket) {
        console.log(socket);
        this.addConnection(socket);
        socket.on('data', (data) =>
            this.onData(socket, data)
        );
    }

    addConnection() {
        this.connections.push(socket);
    }

    onData(socket, data) {
        console.log("received: ", data.toString());
        data = JSON.parse(dataAsStream);
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
            case messagesStrings.TRANSFER_INITIATED:
                this.updateSenderPeerTransfers(`${socket.address}:${socket.port}`, 1);
            default:
                console.log(`Mensagem desconhecida recebida de ${socket.address}:${socket.port}. \nConteúdo: ${dataAsStream.toString()}`);
        }
    }

    broadcast(data) {
        this.connections.forEach(socket => socket.write(data))
    }

    sendPDBFile(socket) {
        console.log('Enviando arquivos PDB');
        //TODO: implementar envio dos arquivos PDB criptografados
        socket.write(JSON.stringify({ message: messagesStrings.PDB_FILES, pdbfiles: this.pdbfiles }))
    }
}