const fs = require('fs');
const forge = require('node-forge');
const crypto = require('crypto');

const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
  modulusLength: 2048, // Tamanho da chave em bits
});

fs.writeFileSync('public.pem', publicKey.export({ type: 'spki', format: 'pem' }));
fs.writeFileSync('private.pem', privateKey.export({ type: 'pkcs8', format: 'pem' }));


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

// Exemplo de uso para criptografar um arquivo
encryptFile('arquivo_original.txt', 'arquivo_criptografado.txt', 'public.pem');

// Exemplo de uso para descriptografar um arquivo
decryptFile('arquivo_criptografado.txt', 'arquivo_descriptografado.txt', 'private.pem');