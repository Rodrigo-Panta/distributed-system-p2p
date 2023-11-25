//index.js
require("dotenv").config();
const statusesStrings = require('../common/statuses');

let port = process.env.PORT;
if (!port) {
    console.log('Variável de ambiente PORT não definida');
    process.exit(1);
}

console.log("Porta: ", port);

const Server = require("./server");
const server = new Server(port, statusesStrings.TRANSFER_COMPLETE, 13, 10);



