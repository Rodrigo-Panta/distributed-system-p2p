const crypto = require('crypto');
const net = require("net");
const fs = require('fs');
const messagesStrings = require('../common/messages');
const statusesStrings = require('../common/statuses');
const {
    generateKeyPair,
    encryptFileWithPublicKey,
    decryptFileWithPrivateKeyAndSymmetricKey,
    encryptWithSymmetricKey,
    decryptWithSymmetricKey
} = require('../criptography/criptography.js');

module.exports = class Peer {
    constructor(port, status, fileAmount) {
        this.port = port;
        this.connections = [];
        const server = net.createServer((socket) => {
            this.onSocketConnected(socket)
        });
        server.listen(port, () => console.log("Ouvindo porta " + port))

        this.keyPair = generateKeyPair();
        this.publicKey = this.keyPair.publicKey;

        this.status = status;
        this.successCount = 0;
        this.fileAmount = fileAmount;

        this.symmetricKey = crypto.randomBytes(32);
    }

    async connectToTrustedPeerAndExchangeKeys(peerAddress) {
        const trustedSocket = await this.connectToAsync(peerAddress);

        // Step 1: Exchange public keys
        const trustedPublicKey = await this.exchangePublicKeyWith(trustedSocket);

        // Step 2: Encrypt the symmetric key with the trusted peer's public key
        const encryptedSymmetricKey = this.encryptWithPublicKey(this.symmetricKey, trustedPublicKey);

        // Step 3: Send the encrypted symmetric key to the trusted peer
        this.sendEncryptedSymmetricKey(trustedSocket, encryptedSymmetricKey);

        // Store the symmetric key for later use
        this.symmetricKey = crypto.randomBytes(32); // Generate a new symmetric key for each connection
    }

    encryptWithSymmetricKey(data) {
        const encrypted = encryptWithSymmetricKey(data, this.symmetricKey);
        return encrypted;
    }

    decryptWithSymmetricKey(data) {
        const decrypted = decryptWithSymmetricKey(data, this.symmetricKey);
        return decrypted;
    }

    async connectToAsync(address) {
        return new Promise((resolve, reject) => {
            if (address.split(":").length !== 2) {
                reject(new Error("O endereço do outro peer deve ser composto por host:port "));
            }

            const [host, port] = address.split(":");
            const socket = net.createConnection({ port, host }, () => {
                this.onSocketConnected(socket);
                resolve(socket);
            });

            socket.on('error', (err) => {
                socket.destroy(); // Close the socket if an error occurs
                reject(err);
            });

            // Handle the case where the connection is refused
            socket.on('end', () => {
                reject(new Error('Connection refused'));
            });
        });
    }

    sendEncryptedSymmetricKey(socket, encryptedSymmetricKey) {
        socket.write(JSON.stringify({ message: messagesStrings.ENCRYPTED_KEY, encryptedSymmetricKey }));
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
        } catch (e) {}

        if (data != null) {
            // Decrypt the data with the symmetric key
            data = JSON.parse(this.decryptWithSymmetricKey(data));

            // Handle other messages
            this.onMessageData(socket, data);

        } else {
            this.onStreamedData(dataAsStream);
        }
    }

    onMessageData(socket, data) {
        if (data && data['message']) {
            let message = data['message'];
            switch (message) {
                case messagesStrings.SENDER_LIST:
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
    }

    onStreamedData(dataAsStream) {
        //console.log("data is being streamed");
    }

    broadcast(data) {
        this.connections.forEach(socket => socket.write(data))
    }

    sendPDBFile(socket, index) {
        const sourceFile = `file/pdb_${index}.zip`;
        const encryptedFile = `file/pdb_${index}_encrypted.zip`;

        this.validatePublicKey(socket);

        let connection = this.connections.find(el => el['socket'] == socket);

        // Encrypt the file with the symmetric key
        const encryptedData = encryptWithSymmetricKey(fs.readFileSync(sourceFile, 'binary'), this.symmetricKey);
        fs.writeFileSync(encryptedFile, encryptedData, 'binary');

        socket.write(JSON.stringify({ message: messagesStrings.SEND_PDB_FILES, 'index': index }));

        const sourceFileStream = fs.createReadStream(encryptedFile);
        const fileSize = fs.statSync(encryptedFile).size;

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
            console.log(`Arquivo pdb_${index}_encrypted.zip enviado`);
        });

        sourceFileStream.on('error', (err) => {
            console.error(`Erro durante a transferência do arquivo pdb_${index}.zip:`, err.message);
        });
    }

    receivePDBFiles(socket, index) {
        console.log(`Recebendo arquivo PDB ${index}`);
        const encryptedFile = `./file/pdb_${index}_encrypted.zip`;
        this.fsWriteStream = fs.createWriteStream(encryptedFile);
        socket.pipe(this.fsWriteStream);

        this.fsWriteStream.on('finish', () => {
            console.log(`Arquivo pdb_${index}_encrypted.zip recebido`);

            const decryptedFile = `./file/pdb_${index}.zip`;

            // Decrypt the file with the symmetric key
            decryptFileWithPrivateKeyAndSymmetricKey(encryptedFile, decryptedFile, '../criptography/keys/self/private.pem', this.symmetricKey);

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
