# distributed-system-p2p
This is a Node.js Peer-to-Peer application that copies a series of files and shares them among peers using cryptography.

## Run
To run the server and the peers, you should have npm installed.

To run the server, define the environment variable PORT with a desired port value:

`cd src`

`npm i`

`node server/index.js` 

To run the peer:

`cd src`

`npm i`

`node peer/index.js [server_ip]:[server_port]` 
