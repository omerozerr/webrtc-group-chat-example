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
const http = require("http");

const bodyParser = require("body-parser");
const main = express();
const SerialPort = require("serialport");
const Readline = require("@serialport/parser-readline");
const ChildProcess = require("child_process");
const Sound = require('node-aplay');


const pythonPath =
    "/home/wattsup/Desktop/server/webrtc-group-chat-example/voice_detection/my-venv/bin/python3"; // Adjust this path to where your venv is
let spawn = 0;


const pyProcess = ChildProcess.spawn(pythonPath, [
    "-u",
    "/home/wattsup/Desktop/server/webrtc-group-chat-example/voice_detection/new_prediction.py",
]);
const pyProcess_bluetooth = ChildProcess.spawn("python", [
    "-u",
    "/home/wattsup/Desktop/server/webrtc-group-chat-example/bluetooth/bluetooth_script.py",
]);
const pyProcess_movement = ChildProcess.spawn("python", [
    "-u",
    "/home/wattsup/Desktop/server/webrtc-group-chat-example/movement/main.py",
]);

let voice_detection_out = "0";
let bluetooth_out = "";
let movement_out = "";
let cry_count = 0;
let isPlaying = false;
let temperature = 0;
let avg_bpm = 0;

pyProcess.on("error", (error) => {
    console.error("Failed to start subprocess.", error);
});

pyProcess.on("close", (code) => {
    console.log(`Child process exited with code ${code}`);
});

pyProcess.stdout.on("data", (data) => {
    console.log("STDOUT_voice:", data.toString());

});

pyProcess_bluetooth.stdout.on('data', (data) => {
    const output = data.toString().toLowerCase().trim();
    console.log("STDOUT_bluetooth:", output);

    // Split the output into lines
    const lines = output.split('\n');

    lines.forEach((line) => {
        line = line.trim();
        // Parse temperature and avg_bpm from the output
        try {
            if (line.includes('temperature:')) {
                const tempMatch = line.match(/temperature: (\d+(\.\d+)?)/);
                if (tempMatch) {
                    temperature = parseFloat(tempMatch[1]);
                }
            } else if (line.includes('avg_bpm=')) {
                const bpmMatch = line.match(/avg_bpm=(\d+(\.\d+)?)/);
                if (bpmMatch) {
                    avg_bpm = parseFloat(bpmMatch[1]);
                }
            }
        } catch (error) {
            console.log("Invalid data", line);
        }
    });

    console.log("Temperature:", temperature);
    console.log("Avg BPM:", avg_bpm);
});

pyProcess_bluetooth.on("error", (error) => {
    console.error("Failed to start subprocess.", error);
});

pyProcess_bluetooth.on("close", (code) => {
    console.log(`Child process exited with code ${code}`);
});

pyProcess_bluetooth.stderr.on("data", (data) => {
    console.error("STDERR:", data.toString());
});

pyProcess_movement.stdout.on("data", (data) => {
    console.log("STDOUT_movement:", data.toString());
    movement_out = data.toString();
});

pyProcess_movement.on("error", (error) => {
    console.error("Failed to start subprocess.", error);
});

pyProcess_movement.on("close", (code) => {
    console.log(`Child process exited with code ${code}`);
});

pyProcess_movement.stderr.on("data", (data) => {
    console.error("STDERR:", data.toString());
});
//const server = http.createServer(main)

let privateKey, certificate;

privateKey = fs.readFileSync("ssl/server-key.pem", "utf8");
certificate = fs.readFileSync("ssl/server-cert.pem", "utf8");
const credentials = { key: privateKey, cert: certificate };
const server = https.createServer(credentials, main);
// const server = http.createServer(main);

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


const player = require("play-sound")();

function playLullaby(random = 0, number) {
    // Generate a random lullaby number between 1 and 5
    if (isPlaying) {
        console.log(
            `Lullaby requested, but another lullaby is currently playing.`
        );
        return; // Skip playing a new lullaby if one is already playing
    }
    let lullabyNumber;
    if (random) {
        lullabyNumber = Math.floor(Math.random() * 2) + 1;
    } else {
        lullabyNumber = number;
    }
    console.log(`Playing Lullaby ${lullabyNumber}`);
    // Add logic to play the lullaby here
    // For example, you can use a library like 'play-sound' to play an audio file
    // Install play-sound using npm: npm install play-sound
    // Then use it to play the lullaby file based on the lullabyNumber
    const lullabyPath = `lullabies/lullaby${lullabyNumber}.wav`;
    isPlaying = true; // Set the isPlaying flag to true

    player.play(lullabyPath, function (err) {
        if (err) {
            console.error("Error playing the lullaby:", err);
            isPlaying = false; // Reset the flag if there's an error
            return;
        }
        console.log(`Lullaby ${lullabyNumber} finished playing.`);
        isPlaying = false; // Reset the flag when the lullaby finishes playing
        // Lullaby finished playing
    });
}





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

    socket.on("error", (error) => {
        console.log(`[${socket.id}] error: ${error}`);
    });

    socket.on("python_data", function (data) {
        console.log("Received data from Python:", data);
        // Broadcast or emit this data to other clients
        io.emit("update_ui", data); // Adjust 'update_ui' to your specific needs
    });

    pyProcess.stdout.on("data", (data) => {
       
        voice_detection_out = data.toString();
        if (voice_detection_out === "cry\n") {
            cry_count += 1;
        } else {
            cry_count = 0;
        }
        socket.emit("voice_detection_data", {
            data: voice_detection_out,
        });
        if (cry_count == 2) {
            playLullaby((random = 1));
        }
    });

    setInterval(() => {
        //Emitting both temperature and heart rate data together
        socket.emit("temperature", {
            data: temperature,
        });
        socket.emit("avg_bpm", {
            data: avg_bpm,
        });
        socket.emit("movement", {
            data: movement_out,
        });
    }, 2000);

    /* const port = new SerialPort("COM13", { baudRate: 9600 });
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
    }); */
    // Emit sensor data every 5 seconds as an example
    /*setInterval(() => {
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
    }, 2000);*/

    socket.on("play_lullaby", function (message) {
        const lullabyNumber = message.lullabyNumber;
        console.log(`Play Lullaby ${lullabyNumber}`);
        playLullaby((random = 0), (number = lullabyNumber));
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
