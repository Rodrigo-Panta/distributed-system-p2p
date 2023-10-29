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
            case messagesStrings.SENDER_LIST:
                //TODO: receber lista de nós que podem enviar o arquivo e buscar em cada um deles em ordem
                console.log('Conectando com outros nós para buscar o arquivo pdb');
            case messagesStrings.PDB_FILES:
                this.savePdbFiles(data['pdbFiles']);
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

    savePDBFiles(pdbFiles) {
        console.log('salvando os arquivos PDB em disco e na memória')
    }
}