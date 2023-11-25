const https = require('https');
const fs = require('fs');
const { TRANSFER_COMPLETE } = require('./messages');

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
        await _getPdbFile(serverAddress, i + 1, peer);
    }
}

async function _getPdbFile(serverAddress, index, peer) {
    return new Promise(function (resolve, reject) {
        req = https.get(`https://${serverAddress}/file?number=${index}`, function (response) {
            try {
                let writeStream = fs.createWriteStream(`file/pdb_${index}.zip`);
                response.pipe(writeStream);
                response.on('error', function (e) {
                    reject(e);
                });
                response.on('end', function () {
                    peer.successCount++;
                    resolve(true);
                });

            } catch (e) {
                reject(e);
            }

        });
    });
}

async function transferFinished(serverAddress, peer) {
    return new Promise(function (resolve, reject) {
        // The data you want to send in the request body
        const postData = JSON.stringify({
            message: TRANSFER_COMPLETE,
            port: `${peer.port}`,
        });

        // Options for the HTTP request
        const options = {
            hostname: serverAddress.split(':')[0],
            port: serverAddress.split(':')[1],
            path: '/transfer-complete',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(postData),
            },
            rejectUnauthorized: false,
        };

        const req = https.request(options, (res) => {
            let responseData = '';
            res.on('data', (chunk) => {
                responseData += chunk;
            });
            res.on('end', () => {
                console.log('Response:', responseData);
            });
        });

        req.on('error', (e) => {
            console.error('Error:', e.message);
        });

        req.write(postData);

        req.end();
        console.log("Transfer finished")
    });
}


module.exports.getTopPeers = getTopPeers;
module.exports.getPdbFiles = getPdbFiles;
module.exports.transferFinished = transferFinished;