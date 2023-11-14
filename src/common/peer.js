const { Client, Server } = require('ssh2');
const fs = require('fs');
const messagesStrings = require('../common/messages');
const statusesStrings = require('../common/statuses');
const { utils: { generateKeyPair, generateKeyPairSync } } = require('ssh2');

module.exports = class Peer {

    constructor(username, port, status, fileAmount) {
        this.port = port;
        this.username = username;
        this.connections = [];
        this.connections = [];
        this.server = null;
        this.status = status;
        this.successCount = 0;
        this.fileAmount = fileAmount;
        this.availablePeers = [];

        let keys = generateKeyPairSync('ed25519');
        this.privateKey = keys.private;
        this.publicKey = keys.public;

        this.initializeServer();

    }

    initializeServer() {
        this.server = new Server({
            hostKeys: [this.privateKey],
        });

        this.server.listen(this.port, () => console.log("Ouvindo porta " + this.port))

        this.server.on('connection', (client, info) => {
            this.handleConnection(client, info);
        });

    }

    connectTo(address) {
        if (address.split(":").length !== 2)
            throw Error("O endereço do servidor deve ser composto por host:port ");
        const [host, port] = address.split(":");
        const client = new Client();

        client.on('ready', async () => {
            console.log(`Connected to ${host}:${port}`);
            this.addConnection(client);

            const stream = client.shell();
            stream.on('close', () => {
                console.log('Connection closed');
                this.removeConnection(client);
                client.end();
            });
            this.addConnection(client);
            await this.onPeerConnected(client);
        });

        client.connect({
            host,
            port,
            username: this.username,
            privateKey: this.privateKey,
        });

    }

    async onPeerConnected(client) {
        switch (this.status) {
            case statusesStrings.UNCONNECTED:
                this.status = statusesStrings.CONNECTED_TO_SERVER;
                break;
            case statusesStrings.IN_TRANSFER:
                await this.downloadPdbFiles(client);
            // this.handleShell(stream);

            // stream.write('echo "Hello from Peer 1"\n');
            // stream.end();
        }
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
        this.connections.push(client);
        client.on('session', (accept, reject) => {
            const session = accept();
            session.on('shell', (accept, reject) => {
                const shell = accept();
                this.handleShell(client, shell);
            });
        });
    }


    handleShell(client, shell) {
        shell.on('data', (data) => {
            const command = data.toString().trim();
            console.log(`Received command: ${command}`);
            this.onData(client, data);
        });

        shell.on('end', () => {
            console.log('Shell session ended');
        });
    }

    onData(client, dataAsStream) {
        let data = null;
        try {
            data = JSON.parse(dataAsStream);
            console.log("received: ", dataAsStream.toString());
        } catch (e) {
        }

        if (data != null) {
            this.onMessageData(client, data);

        } else {
            this.onStreamedData(dataAsStream);
        }
    }

    onMessageData(client, data) {
        let message = data['message'];
        switch (message) {
            case messagesStrings.SENDER_LIST:
                if (this.status == statusesStrings.TRANSFER_COMPLETE) {
                    console.error("Transfer already complete!");
                    return;
                }
                this.status = statusesStrings.IN_TRANSFER;
                this.availablePeers = data['addresses'];
                this.connectTo(this.availablePeers.pop());
                console.log('Conectando com outros nós para buscar o arquivo pdb');
                break;
            default:
                console.log(`Mensagem desconhecida recebida de ${socket.address}:${socket.port}. \nConteúdo: ${dataAsStream.toString()}`);
        }
    }

    onStreamedData(dataAsStream) {
        console.log("data is being streamed");
    }

    async downloadPdbFiles(client) {
        try {
            for (let i = this.successCount + 1; i <= this.fileAmount; i++) {
                await this.downloadFile(client, i);
            }
            client.end();
        } catch (e) {
            this.status = statusesStrings.TRANSFER_ERROR;
        }
    }

    downloadFile(client, index) {
        return new Promise((resolve, reject) => {
            client.sftp((err, sftp) => {
                if (err) reject(err);

                sftp.fastGet(`files/pdb_${index}.zip`, `files/pdb_${index}.zip`, (downloadErr) => {
                    if (downloadErr) {
                        console.error(`Error downloading file pdb_${index}.zip: ${downloadErr.message}`);
                    } else {
                        console.log(`File pdb_${index}.zip downloaded successfully to ${localFilePath}`);
                    }
                    sftp.end();
                    resolve();
                });
            });
        });


    }
}