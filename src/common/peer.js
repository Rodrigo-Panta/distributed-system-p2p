const net = require("net");
const fs = require('fs');
const messagesStrings = require('../common/messages');
const statusesStrings = require('../common/statuses');

module.exports = class Peer {
    constructor(port, status, fileAmount) {
        this.port = port;
        this.connections = [];
        const server = net.createServer(
            (socket) => {
                this.onSocketConnected(socket)
            }
        );
        server.listen(port, () => console.log("Ouvindo porta " + port))
        this.status = status;
        this.successCount = 0;
        this.fileAmount = fileAmount;
        // Gerar chaves
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

    addConnection(socket) {
        this.connections.push(socket);
    }

    onData(socket, dataAsStream) {
        try {
            let data = JSON.parse(dataAsStream);
            this.onMessageData(socket, data);
            console.log("received: ", dataAsStream.toString());
        } catch (e) {
            console.log("Received non Json data");
            this.onStreamedData(dataAsStream);
        }

    }

    onMessageData(socket, data) {
        let message = data['message'];
        switch (message) {
            case messagesStrings.SENDER_LIST:
                //TODO: receber lista de nós que podem enviar o arquivo e buscar em cada um deles em ordem
                console.log('Conectando com outros nós para buscar o arquivo pdb');
                break;
            case messagesStrings.SEND_PDB_FILES:
                if (this.status == statusesStrings.WAITING_PDB || this.status == statusesStrings.TRANSFER_ERROR) {
                    if (data['index'] == this.successCount + 1) {
                        this.status = statusesStrings.IN_TRANSFER;
                        this.receivePDBFiles(socket, data['index']);
                    }
                }
                break;
            case messagesStrings.GET_PDB_FILES:
                this.sendPDBFile(socket, data['index']);
                break;
            default:
                console.log(`Mensagem desconhecida recebida de ${socket.address}:${socket.port}. \nConteúdo: ${dataAsStream.toString()}`);
        }
    }

    onStreamedData(dataAsStream) {
        console.log("data is being streamed");
    }


    broadcast(data) {
        this.connections.forEach(socket => socket.write(data))
    }

    sendPDBFile(socket, index) {

        socket.write(JSON.stringify({ message: messagesStrings.SEND_PDB_FILES, 'index': index }));
        const sourceFile = `file/pdb_${index}.zip`;

        //Encriptografar arquivo com a chave pública do socket

        const sourceFileStream = fs.createReadStream(sourceFile);

        var fileSize = fs.statSync(sourceFile).size;

        const writeStream = socket;
        let previousPercentage = 0;

        sourceFileStream.on('data', (chunk) => {
            const percentage = (writeStream.bytesWritten / fileSize) * 100;
            if (Math.floor(percentage) > Math.floor(previousPercentage)) {
                console.log(`progress:${percentage.toFixed(0)}%`);
                previousPercentage = percentage;
            }
        });

        sourceFileStream.pipe(writeStream);

        sourceFileStream.on('end', () => {
            console.log(`Arquivo files.zip salvo em ${sourceFile}`);
        });

        sourceFileStream.on('error', (err) => {
            console.error('Erro durante a transferência do arquivo files.zip:', err.message);
        });

    }

    receivePDBFiles(socket, index) {
        console.log(`salvando o arquivo PDB ${index}`);
        this.fsWriteStream = fs.createWriteStream(`./file/pdb_${index}.zip`);
        socket.pipe(this.fsWriteStream);

        this.fsWriteStream.on('end', () => {
            console.log(`Arquivo ${index}.zip`);
            this.successCount++;
            if (this.successCount >= this.fileAmount) {
                socket.write(JSON.stringify({ message: messagesStrings.GET_PDB_FILES, 'index': this.successCount + 1 }));
            } else {
                socket.write(JSON.stringify({ message: messagesStrings.TRANSFER_COMPLETE }));
            }
        });
    }
}