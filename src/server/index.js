//index.js
require("dotenv").config();

let port = process.env.PORT;
let username = process.env.USERNAME;
if (!port) {
    console.log('Variável de ambiente PORT não definida');
    process.exit(1);
}

console.log("Porta: ", port);

const Server = require("./server");
const server = new Server(username, port, 13, 10);

console.log(process.argv.length);


