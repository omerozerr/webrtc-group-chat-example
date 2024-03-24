/**************/
/*** CONFIG ***/
/**************/
const PORT = 8080;

/*************/
/*** SETUP ***/
/*************/
const fs = require("fs");
const express = require("express");
//var http = require('http');
const https = require("https");
const bodyParser = require("body-parser");
const main = express();
const SerialPort = require("serialport");
const Readline = require("@serialport/parser-readline");
//const server = http.createServer(main)

let privateKey, certificate;

privateKey = fs.readFileSync("ssl/server-key.pem", "utf8");
certificate = fs.readFileSync("ssl/server-cert.pem", "utf8");
const credentials = { key: privateKey, cert: certificate };
const server = https.createServer(credentials, main);

const io = require("socket.io").listen(server);
//io.set('log level', 2);

server.listen(PORT, null, function () {
    console.log("Listening on port " + PORT);
});
//main.use(express.bodyParser());

main.get("/", function (req, res) {
    res.sendFile(__dirname + "/client.html");
});
// main.get('/index.html', function(req, res){ res.sendfile('newclient.html'); });
// main.get('/client.html', function(req, res){ res.sendfile('newclient.html'); });

/*************************/
/*** INTERESTING STUFF ***/
/*************************/
var channels = {};
var sockets = {};

/**
 * Users will connect to the signaling server, after which they'll issue a "join"
 * to join a particular channel. The signaling server keeps track of all sockets
 * who are in a channel, and on join will send out 'addPeer' events to each pair
 * of users in a channel. When clients receive the 'addPeer' even they'll begin
 * setting up an RTCPeerConnection with one another. During this process they'll
 * need to relay ICECandidate information to one another, as well as SessionDescription
 * information. After all of that happens, they'll finally be able to complete
 * the peer connection and will be streaming audio/video between eachother.
 */
io.sockets.on("connection", function (socket) {
    socket.channels = {};
    sockets[socket.id] = socket;

    console.log("[" + socket.id + "] connection accepted");
    socket.on("disconnect", function () {
        for (var channel in socket.channels) {
            part(channel);
        }
        console.log("[" + socket.id + "] disconnected");
        delete sockets[socket.id];
    });

    const port = new SerialPort("COM13", { baudRate: 9600 });
    const parser = port.pipe(new Readline({ delimiter: "\n" }));

    parser.on("data", (line) => {
        console.log(`Received: ${line}`);
        try {
            // Assuming the line is a JSON string that looks like this: {"temperature":36,"heartRate":75,"move":1}
            // You might need to adjust the parsing logic based on your sensor data format
            //const data = JSON.parse(line);

            // Emitting the parsed data
            socket.emit("sensor_data", {
                temperature: Math.floor(line),
                //temperature: Math.floor(data.temperature),
                //heartRate: data.heartRate,
                //move: data.move,
            });
        } catch (error) {
            console.error("Error parsing data:", error);
        }
    });

    port.on("error", (err) => {
        console.log("Error:", err.message);
    });
    // Emit sensor data every 5 seconds as an example
    /* setInterval(() => {
        //Generate random temperature between 35 and 43
        const temperature = Math.floor(Math.random() * (43 - 35 + 1)) + 35;

        //Generate random heart rate between 40 and 180
        const heartRate = Math.floor(Math.random() * (180 - 40 + 1)) + 40;
        const move = Math.floor(Math.random() * 2);

        //Emitting both temperature and heart rate data together
        socket.emit("sensor_data", {
            temperature: temperature,
            heartRate: heartRate,
            move: move,
        });
    }, 1000); */

    socket.on("play_lullaby", function (message) {
        const lullabyNumber = message.lullabyNumber;
        console.log(`Play Lullaby ${lullabyNumber}`);
        // Additional logic here
    });

    socket.on("join", function (config) {
        console.log("[" + socket.id + "] join ", config);
        var channel = config.channel;
        var userdata = config.userdata;

        if (channel in socket.channels) {
            console.log("[" + socket.id + "] ERROR: already joined ", channel);
            return;
        }

        if (!(channel in channels)) {
            channels[channel] = {};
        }

        for (id in channels[channel]) {
            channels[channel][id].emit("addPeer", {
                peer_id: socket.id,
                should_create_offer: false,
            });
            socket.emit("addPeer", { peer_id: id, should_create_offer: true });
        }

        channels[channel][socket.id] = socket;
        socket.channels[channel] = channel;
    });

    function part(channel) {
        console.log("[" + socket.id + "] part ");

        if (!(channel in socket.channels)) {
            console.log("[" + socket.id + "] ERROR: not in ", channel);
            return;
        }

        delete socket.channels[channel];
        delete channels[channel][socket.id];

        for (id in channels[channel]) {
            channels[channel][id].emit("removePeer", { peer_id: socket.id });
            socket.emit("removePeer", { peer_id: id });
        }
    }
    socket.on("part", part);

    socket.on("relayICECandidate", function (config) {
        var peer_id = config.peer_id;
        var ice_candidate = config.ice_candidate;
        console.log(
            "[" + socket.id + "] relaying ICE candidate to [" + peer_id + "] ",
            ice_candidate
        );

        if (peer_id in sockets) {
            sockets[peer_id].emit("iceCandidate", {
                peer_id: socket.id,
                ice_candidate: ice_candidate,
            });
        }
    });

    socket.on("relaySessionDescription", function (config) {
        var peer_id = config.peer_id;
        var session_description = config.session_description;
        console.log(
            "[" +
                socket.id +
                "] relaying session description to [" +
                peer_id +
                "] ",
            session_description
        );

        if (peer_id in sockets) {
            sockets[peer_id].emit("sessionDescription", {
                peer_id: socket.id,
                session_description: session_description,
            });
        }
    });
});

// Serial port handling
//const port = new SerialPort('COM13', { baudRate: 9600 }); // Adjust your COM port here
//const parser = port.pipe(new Readline({ delimiter: '\r\n' }));

//parser.on('data', data => {
//    io.sockets.emit('sensor_data', {'data': data});
//    console.log(data); // For debugging
//});
