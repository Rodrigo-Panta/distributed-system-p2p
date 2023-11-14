const Peer = require("../common/peer");
const messagesStrings = require('../common/messages');
const statusesStrings = require('../common/statuses');

module.exports = class Server extends Peer {
    constructor(username, port, fileAmount, maxSenders) {
        super(username, port, statusesStrings.TRANSFER_COMPLETE, fileAmount);
        this.maxSenders = maxSenders;
        // Objeto para controlar os estados de cada conexão
        this.senderPeers = [];
    }

    handleConnection(client, info) {
        console.log(`Connection from ${info.ip}`);

        client.on('authentication', (ctx) => {
            if (
                ctx.method === 'publickey' &&
                ctx.key.algo === 'ssh-rsa' &&
                ctx.key.data.equals(this.publicKey) &&
                ctx.username === this.username
            ) {
                ctx.accept();
            } else {
                ctx.reject();
            }
        });

        client.on('ready', () => {
            console.log('Client is ready');
            this.addConnection(client);
        });

        client.on('end', () => {
            console.log('Client disconnected');
            this.removeConnection(client);
        });

    }

    addConnection(client) {
        super.addConnection(client);
        this.sendTopPeers(client);
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
                this.sendTopPeers(socket);
                break;
            default:
                console.log(`Mensagem desconhecida recebida de ${socket.address}:${socket.port}. \nConteúdo: ${dataAsStream.toString()}`);
        }
    }

    sendTopPeers(client) {
        // Manda para o nó recem conectado uma lista de nó que podem lhe enviar o arquivo 
        let sendersCount = this.senderPeers.length;
        let senderAddresses = [];
        if (sendersCount == 0) {
            senderAddresses.push(`${this.server.address}:${this.port}`);
            return;
        }
        for (let i in Math.min(this.maxSenders, sendersCount)) {
            senderAddresses.push(this.senderPeers[i]['address']);
        }
        const stream = client.shell();
        this.handleShell(stream);

        stream.write(JSON.stringify({ message: messagesStrings.SENDER_LIST }, senderAddresses));
        stream.end();
    }

    updateSenderPeerTransfers(address, amount) {
        this.senderPeers.find(item => item['address'] == address).currentTransfers += amount;
    }
}