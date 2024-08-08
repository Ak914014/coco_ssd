import React, { useEffect, useRef } from "react";
import io from "socket.io-client";

/**
 * Socket connection instance for communicating with the server.
 * @type {SocketIOClient.Socket}
 */
const socket = io("http://localhost:5000", {
  withCredentials: true,
  extraHeaders: {
    "my-custom-header": "abcd",
  },
});

/**
 * Main App component for displaying video feed and object detection results.
 * @component
 */
function App() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  /**
   * Effect hook to initialize video stream and setup socket events.
   * @function
   * @name useEffect
   */
  useEffect(() => {
    /**
     * Starts the video stream from the user's webcam and sets up event listeners.
     * @async
     * @function
     */
    navigator.mediaDevices.getUserMedia({ video: true }).then((stream) => {
      videoRef.current.srcObject = stream;
    });

    videoRef.current.addEventListener("play", () => {
      setInterval(() => {
        const canvas = canvasRef.current;
        const context = canvas.getContext("2d");
        context.drawImage(videoRef.current, 0, 0);

        /**
         * Converts the canvas image to a JPEG data URL and emits it to the server.
         * @type {string}
         */
        const blob = canvas.toDataURL("image/jpeg", 0.8);
        socket.emit("image", blob.split(",")[1]);
      }, 300);
    });

    /**
     * Listens for 'predictions' events from the server and updates the canvas.
     * @param {Array<Object>} predictions - Array of prediction objects.
     * @param {string} predictions[].class - The class name of the detected object.
     * @param {Array<number>} predictions[].bbox - Bounding box of the detected object [x, y, width, height].
     */
    socket.on("predictions", (predictions) => {
      const context = canvasRef.current.getContext("2d");
      context.clearRect(
        0,
        0,
        canvasRef.current.width,
        canvasRef.current.height
      );
      context.drawImage(videoRef.current, 0, 0);
      predictions.forEach((prediction) => {
        context.beginPath();
        context.rect(
          prediction.bbox[0],
          prediction.bbox[1],
          prediction.bbox[2],
          prediction.bbox[3]
        );
        context.lineWidth = 2;
        context.strokeStyle = "red";
        context.fillStyle = "red";
        context.stroke();
        context.fillText(
          prediction.class,
          prediction.bbox[0],
          prediction.bbox[1] > 10 ? prediction.bbox[1] - 5 : 10
        );
      });
    });
  }, []);

  return (
    <div className="w-full h-screen p-5  bg-gray-800">
      <h3 className="text-white text-2xl">COCO SSD</h3>
      <h3 className="text-white text-xl">
        Object detection model that aims to localize and identify multiple
        objects in a single image.
      </h3>
      <hr className="p-2" />
      <div className="flex flex-row gap-10  h-1/2 ">
        <div>
          <video
            ref={videoRef}
            className="border-2 border-black"
            width="420"
            height="320"
            autoPlay
          />
        </div>
        <div>
          <canvas
            ref={canvasRef}
            width="680"
            height="480"
            className="border-2  border-black"
          />
        </div>
      </div>
    </div>
  );
}

export default App;
