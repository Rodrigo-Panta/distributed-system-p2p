const fs = require('fs');
const forge = require('node-forge');
const crypto = require('crypto');
const path = require('path');

function generateKeyPair() {
    const keysFolder = path.join(__dirname, '..', 'keys/self');

    // Verifique se as chaves já existem
    if (!fs.existsSync(path.join(keysFolder, 'public.pem')) || !fs.existsSync(path.join(keysFolder, 'private.pem'))) {
        const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
            modulusLength: 2048,
        });

        const publicKeyPem = publicKey.export({ type: 'spki', format: 'pem' });
        const privateKeyPem = privateKey.export({ type: 'pkcs8', format: 'pem' });

        if (!fs.existsSync(keysFolder)) {
            fs.mkdirSync(keysFolder, { recursive: true });
        }

        fs.writeFileSync(path.join(keysFolder, 'public.pem'), publicKeyPem);
        fs.writeFileSync(path.join(keysFolder, 'private.pem'), privateKeyPem);

        console.log('Chaves criadas e salvas em', keysFolder);

        return { publicKey: publicKeyPem, privateKey: privateKeyPem };
    }

    const publicKeyPem = fs.readFileSync(path.join(keysFolder, 'public.pem'), 'utf8');
    const privateKeyPem = fs.readFileSync(path.join(keysFolder, 'private.pem'), 'utf8');
    
    return { publicKey: publicKeyPem, privateKey: privateKeyPem };
}

// Função para criptografar um arquivo usando a chave pública
function encryptFile(inputFilePath, outputFilePath, publicKeyPath) {
    const publicKeyPem = fs.readFileSync(publicKeyPath, 'utf8');
    const publicKey = forge.pki.publicKeyFromPem(publicKeyPem);

    const inputData = fs.readFileSync(inputFilePath);
    const encryptedData = publicKey.encrypt(inputData);

    fs.writeFileSync(outputFilePath, encryptedData, 'binary');
}

// Função para descriptografar um arquivo usando a chave privada
function decryptFile(inputFilePath, outputFilePath, privateKeyPath) {
    const privateKeyPem = fs.readFileSync(privateKeyPath, 'utf8');
    const privateKey = forge.pki.privateKeyFromPem(privateKeyPem);

    const encryptedData = fs.readFileSync(inputFilePath, 'binary');
    const decryptedData = privateKey.decrypt(encryptedData);

    fs.writeFileSync(outputFilePath, decryptedData);
}

module.exports = { generateKeyPair, encryptFile, decryptFile };
