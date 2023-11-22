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

function encryptFileWithPublicKey(inputFilePath, outputFilePath, publicKeyString) {
    const publicKey = forge.pki.publicKeyFromPem(publicKeyString);

    const inputData = fs.readFileSync(inputFilePath);
    const encryptedData = publicKey.encrypt(inputData);

    fs.writeFileSync(outputFilePath, encryptedData, 'binary');
}

function decryptFileWithPrivateKeyAndSymmetricKey(inputFilePath, outputFilePath, privateKeyPath, symmetricKey) {
    const privateKeyPem = fs.readFileSync(privateKeyPath, 'utf8');
    const privateKey = forge.pki.privateKeyFromPem(privateKeyPem);

    const encryptedData = fs.readFileSync(inputFilePath, 'binary');
    const decryptedSymmetricKey = privateKey.decrypt(encryptedData);

    // Use the decrypted symmetric key for further decryption
    const encryptedFileData = fs.readFileSync(inputFilePath);
    const decryptedData = decryptWithSymmetricKey(encryptedFileData, symmetricKey);

    fs.writeFileSync(outputFilePath, decryptedData);
}

function encryptWithSymmetricKey(data, symmetricKey) {
    const cipher = crypto.createCipher('aes-256-cbc', symmetricKey);
    let encrypted = cipher.update(data, 'utf-8', 'hex');
    encrypted += cipher.final('hex');
    return encrypted;
}

function decryptWithSymmetricKey(data, symmetricKey) {
    const decipher = crypto.createDecipher('aes-256-cbc', symmetricKey);

    // Ensure the "data" argument is a string
    const encryptedData = typeof data === 'object' ? JSON.stringify(data) : data;

    try {
        let decrypted = decipher.update(encryptedData, 'hex', 'utf-8');
        decrypted += decipher.final('utf-8');

        // Remove padding
        decrypted = decrypted.replace(/\0+$/, '');

        return decrypted;
    } catch (error) {
        console.error('Error during decryption:', error);
        return null;
    }
}

module.exports = {
    generateKeyPair,
    encryptFileWithPublicKey,
    decryptFileWithPrivateKeyAndSymmetricKey,
    encryptWithSymmetricKey,
    decryptWithSymmetricKey,
};