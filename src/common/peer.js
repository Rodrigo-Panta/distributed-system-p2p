const net = require("net");
const fs = require('fs');
const messagesStrings = require('../common/messages');
const statusesStrings = require('../common/statuses');
const { encryptFile, decryptFile, generateKeyPair } = require('../criptography/criptography.js');

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

        this.keyPair = generateKeyPair();
        this.publicKey = this.keyPair.publicKey;

        this.status = status;
        this.successCount = 0;
        this.fileAmount = fileAmount;


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
        this.connections.push({ socket: socket, publicKey: '' });
        this.sendPublicKey(socket);
    }

    onData(socket, dataAsStream) {
        let data = null;
        try {
            data = JSON.parse(dataAsStream);
            console.log("received: ", dataAsStream.toString());
        } catch (e) {
        }

        if (data != null) {
            // Tratar outras mensagens
            this.onMessageData(socket, data);

        } else {
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
            case messagesStrings.PUBLIC_KEY:
                this.onPublicKeyReceived(socket, data.publicKey);
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

        const sourceFile = `file/pdb_${index}.zip`;
        const encryptedFile = `file/pdb_${index}_encrypted.zip`;

        // Verificar se socket.peerInfo está definido
        this.validatePublicKey(socket);

        // Encriptografar o arquivo antes de enviar
        let connection = this.connections.find(el => el['socket'] == socket);
        encryptFile(sourceFile, encryptedFile, connection['publicKey']);

        socket.write(JSON.stringify({ message: messagesStrings.SEND_PDB_FILES, 'index': index }));

        const sourceFileStream = fs.createReadStream(encryptedFile);
        var fileSize = fs.statSync(encryptedFile).size;

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
            console.log(`Arquivo pdb_${index}.zip enviado`);
        });

        sourceFileStream.on('error', (err) => {
            console.error(`Erro durante a transferência do arquivo pdb_${index}.zip:`, err.message);
        });
    }

    receivePDBFiles(socket, index) {
        console.log(`Recebendo arquivo PDB ${index}`);
        this.fsWriteStream = fs.createWriteStream(`./file/pdb_${index}_encrypted.zip`);
        socket.pipe(this.fsWriteStream);

        this.fsWriteStream.on('finish', () => {
            console.log(`Arquivo pdb_${index}_encrypted.zip recebido`);

            const decryptedFile = `./file/pdb_${index}.zip`;

            // Descriptografar o arquivo recebido
            decryptFile(`./file/pdb_${index}_encrypted.zip`, decryptedFile, '../criptography/keys/self/private.pem');

            console.log(`Arquivo pdb_${index}.zip descriptografado salvo em ${decryptedFile}`);

            this.successCount++;
            if (this.successCount >= this.fileAmount) {
                socket.write(JSON.stringify({ message: messagesStrings.GET_PDB_FILES, 'index': this.successCount + 1 }));
            } else {
                socket.write(JSON.stringify({ message: messagesStrings.TRANSFER_COMPLETE }));
            }
        });

        this.fsWriteStream.on('error', () => {
            console.log(`Erro ao gravar o arquivo ${index}`);
        });
    }

    onPublicKeyReceived(socket, publicKey) {
        // Tratar a chave pública recebida
        //console.log(`Received public key from ${socket.remoteAddress}:${socket.remotePort}: ${publicKey}`);
        // Armazenar a chave pública com o socket
        let connection = this.connections.find((el) => el['socket'] == socket);
        if (connection) {
            connection['publicKey'] = publicKey;
        } else {
            console.error('Connection not found');
        }
    }


    validatePublicKey(socket) {
        let connection = this.connections.find(el => el['socket'] == socket);
        if (!connection || !connection['publicKey']) {
            console.error(`Erro: Chave pública não recebida para ${socket.remoteAddress}:${socket.remotePort}`);
            return;
        }
    }

    sendPublicKey(socket) {
        socket.write(JSON.stringify({ message: messagesStrings.PUBLIC_KEY, publicKey: this.publicKey }));
    }
}