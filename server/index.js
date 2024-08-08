const fs = require('fs');
const path = require('path');
const jpeg = require('jpeg-js');
const express = require("express");
const pureimage = require("pureimage");
const compression = require("compression");
const http = require("http");
const socketIo = require("socket.io");
const nodeFetch = require('node-fetch');
const cors = require('cors');

global.fetch = nodeFetch;

require('@tensorflow/tfjs-backend-cpu');
require('@tensorflow/tfjs-backend-webgl');
const tf = require('@tensorflow/tfjs-node');
const cocoSsd = require('@tensorflow-models/coco-ssd');

const app = express();
const server = http.createServer(app);
 

const io = socketIo(server, {
  cors: {
    origin: "http://localhost:3006", 
    methods: ["GET", "POST"],
    allowedHeaders: ["my-custom-header"],
    credentials: true,
  },
});

app.use(cors({
  origin: "http://localhost:3006",
  credentials: true,
}));

app.use(compression());

const PORT = process.env.PORT || 5000;

let scoreThreshold = 0.5;
let maxDetections = 20;
let model;

/**
 * Load and register font.
 * @async
 */
async function loadFont() {
    const font = pureimage.registerFont(path.join(__dirname, 'SourceSansPro-Regular.ttf'), 'Source Sans Pro');
    await font.load();
}
loadFont();

/**
 * Load COCO-SSD model.
 * @async
 */
async function loadModel() {
    model = await cocoSsd.load();
    console.log('Model ready');
}
console.log('Loading model...');
loadModel();


/**
 * Process image and get detections.
 * @param {Buffer} imageBuffer - The image buffer.
 * @returns {Promise<object[]>} The detections object.
 */
async function reco(imageBuffer) {
    const img = tf.node.decodeImage(imageBuffer);
    const detections = await model.detect(img, maxDetections, scoreThreshold);
    tf.dispose(img);
    return detections;
}

/**
 * Socket.IO connection event.
 * @event connection
 * @param {Socket} socket - The Socket.IO socket instance.
 */
io.on('connection', (socket) => {
    console.log('New client connected');

    /**
     * Event for receiving image data.
     * @event image
     * @param {string} imageData - Base64 encoded image data.
     */
    socket.on('image', async (imageData) => {
        const imageBuffer = Buffer.from(imageData, 'base64');
        const predictions = await reco(imageBuffer);
        socket.emit('predictions', predictions);
    });

    /**
     * Event for client disconnection.
     * @event disconnect
     */
    socket.on('disconnect', () => {
        console.log('Client disconnected');
    });
});

/**
 * Start the server and listen on the specified port.
 */
server.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});