const https = require('https');

async function getTopPeers(serverAddress) {
    try {
        return await _getTopPeers(serverAddress);
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
        req.end()
    });
}
module.exports.getTopPeers = getTopPeers;