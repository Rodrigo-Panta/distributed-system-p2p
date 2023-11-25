const https = require('https');
const fs = require('fs');

async function getTopPeers(serverAddress) {
    try {
        return await _getTopPeers(serverAddress);
    } catch (e) {
        throw new Error('Não foi possível conectar ao servidor');
    }
}

async function getPdbFiles(serverAddress, peer) {
    try {
        return await _getPdbFiles(serverAddress, peer);
    } catch (e) {
        throw new Error('Não foi possível conectar ao servidor');
    }
}

async function _getTopPeers(serverAddress) {
    return new Promise(function (resolve, reject) {
        req = https.get(`https://${serverAddress}/top-peers`, function (response) {
            try {
                response.on('data', function (chunk) {
                    let data = JSON.parse(chunk)
                    resolve(data);
                });
                response.on('error', function (e) {
                    reject(e);
                });

            } catch (e) {
                reject(e);
            }

        });
    });
}


async function _getPdbFiles(serverAddress, peer) {
    for (let i = peer.successCount; i < peer.fileAmount; i++) {
        await _getPdbFile(serverAddress, i + 1);
    }
}

async function _getPdbFile(serverAddress, index) {
    return new Promise(function (resolve, reject) {
        req = https.get(`https://${serverAddress}/file?number=${index}`, function (response) {
            try {
                let writeStream = fs.createWriteStream(`file/pdb_${index}.zip`);
                response.pipe(writeStream);
                response.on('error', function (e) {
                    reject(e);
                });
                response.on('end', function () {
                    resolve(true);
                });

            } catch (e) {
                reject(e);
            }

        });
    });
}


module.exports.getTopPeers = getTopPeers;
module.exports.getPdbFiles = getPdbFiles;