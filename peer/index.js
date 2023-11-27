//index.js
const { getTopPeers, getPdbFiles, transferFinished } = require('./common/promisses');
require("dotenv").config();
const statusesStrings = require('./common/statuses');
const Peer = require("./common/peer");

// let port = process.env.PORT;
port = '30' + (Math.floor(Math.random() * 89) + 10).toString();

if (!port) {
    console.log('Variável de ambiente PORT não definida');
    process.exit(1);
}
console.log("Porta: ", port);

const fileAmount = 11;

if (process.argv.length != 3) {
    console.log('Nó servidor não definido');
    process.exit(1);
}

let serverAddress = process.argv[2];

const peer = new Peer(port, statusesStrings.WAITING_PDB, fileAmount);

async function main() {
    // Inicialmente, o peer atua apenas como receptor e obtém a lista de top peers do servidor
    try {
        let topPeers = await getTopPeers(serverAddress);
        console.log('topPeersData:', topPeers);

        while (peer.successCount < fileAmount) {
            try {
                console.log(`topPeers ${JSON.stringify(topPeers)}`);
                let senderPeer = Object.entries(topPeers.addresses).pop()[0];
                console.log(`senderPeer ${JSON.stringify(senderPeer)}`);

                if (senderPeer) {
                    // Peer obtém arquivos do senderPeer
                    await getPdbFiles(senderPeer, peer);
                    await transferFinished(serverAddress, peer);
                } else {
                    // Se a lista estiver vazia, o servidor envia diretamente o arquivo
                    await getPdbFiles(serverAddress, peer);
                    await transferFinished(serverAddress, peer);
                }
            } catch (e) {
                console.error('Erro ao baixar os arquivos PDB. Tentando novamente');
                console.error(e.message);
            }
        }
    } catch (error) {
        console.error('Erro ao obter top peers do servidor');
        console.error(error.message);
    }
}

main();


