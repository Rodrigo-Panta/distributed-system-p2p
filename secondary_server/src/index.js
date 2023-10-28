//index.js
require("dotenv").config();

let port = process.env.PORT;
let serverAddress = '';

port = '30' + (Math.floor(Math.random() * 89) + 10).toString();


if (!port) {
    console.log('Variável de ambiente PORT não definida');
    process.exit(1);
}

console.log("Porta: ", port);

const Peer = require("./peer");
const server = new Peer(port);


if (process.argv.length <= 2) {
    console.log('Endereço do nó servidor não especificado');
    process.exit(1);
}



