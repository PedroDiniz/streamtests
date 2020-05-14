import React, { useEffect, useState, useRef } from "react";
import Head from "next/head";

const CAMERA_CONSTRAINTS = {
  audio: true,
  video: { width: 960, height: 540 },
};

export default () => {
  const [connected, setConnected] = useState(false);
  const [cameraEnabled, setCameraEnabled] = useState(false);
  const [streaming, setStreaming] = useState(false);
  const [streamKey, setStreamKey] = useState(null);
  const [shoutOut, setShoutOut] = useState("");
  const [selectedLayout, setSelectedLayout] = useState("none");

  const inputStreamRef = useRef();
  const videoRef = useRef();
  const canvasRef = useRef();
  const wsRef = useRef();
  const mediaRecorderRef = useRef();
  const requestAnimationRef = useRef();
  const nameRef = useRef();
  const selectedLayoutRef = useRef();

  const enableCamera = async () => {
    inputStreamRef.current = await navigator.mediaDevices.getUserMedia(
      CAMERA_CONSTRAINTS
    );

    videoRef.current.srcObject = inputStreamRef.current;
    await videoRef.current.play();
    canvasRef.current.height = videoRef.current.clientHeight;
    canvasRef.current.width = videoRef.current.clientWidth;

    requestAnimationRef.current = requestAnimationFrame(updateCanvas);

    setCameraEnabled(true);
  };

  const updateCanvas = () => {
    if (videoRef.current.ended || videoRef.current.paused) {
      return;
    }

    const ctx = canvasRef.current.getContext("2d");

    ctx.drawImage(
      videoRef.current,
      0,
      0,
      videoRef.current.clientWidth,
      videoRef.current.clientHeight
    );

    ctx.fillStyle = "#ff0000";
    ctx.font = "50px monospace";
    ctx.fillText(nameRef.current, 5, 50);

    addSelectedLayout(ctx);

    requestAnimationRef.current = requestAnimationFrame(updateCanvas);
  };

  const addSelectedLayout = (ctx) => {
    const layouts = {
      none: () => {},
      topLeft: () => {
        ctx.drawImage(videoRef.current, 10, 10, 100, 100);
      },
      topRight: () => {
        ctx.drawImage(
          videoRef.current,
          videoRef.current.clientWidth - 100 - 10,
          10,
          100,
          100
        );
      },
      bottomLeft: () => {
        ctx.drawImage(
          videoRef.current,
          10,
          videoRef.current.clientHeight - 100 - 10,
          100,
          100
        );
      },
      bottomRight: () => {
        ctx.drawImage(
          videoRef.current,
          videoRef.current.clientWidth - 100 - 10,
          videoRef.current.clientHeight - 100 - 10,
          100,
          100
        );
      },
    };

    layouts[selectedLayoutRef.current]();
  };

  const stopStreaming = () => {
    mediaRecorderRef.current.stop();
    setStreaming(false);
  };

  const startStreaming = () => {
    setStreaming(true);

    const protocol = window.location.protocol.replace("http", "ws");
    wsRef.current = new WebSocket(
      `${protocol}//${window.location.host}/rtmp?key=${streamKey}`
    );

    wsRef.current.addEventListener("open", function open() {
      setConnected(true);
    });

    wsRef.current.addEventListener("close", () => {
      setConnected(false);
      stopStreaming();
    });

    const videoOutputStream = canvasRef.current.captureStream(30); // 30 FPS
    const audioStream = new MediaStream();
    const audioTracks = inputStreamRef.current.getAudioTracks();
    audioTracks.forEach(function (track) {
      audioStream.addTrack(track);
    });

    const outputStream = new MediaStream();
    [audioStream, videoOutputStream].forEach(function (s) {
      s.getTracks().forEach(function (t) {
        outputStream.addTrack(t);
      });
    });

    mediaRecorderRef.current = new MediaRecorder(outputStream, {
      mimeType: "video/webm",
      videoBitsPerSecond: 3000000,
    });

    mediaRecorderRef.current.addEventListener("dataavailable", (e) => {
      wsRef.current.send(e.data);
    });

    mediaRecorderRef.current.addEventListener("stop", () => {
      stopStreaming();
      wsRef.current.close();
    });

    mediaRecorderRef.current.start(1000);
  };

  useEffect(() => {
    nameRef.current = shoutOut;
  }, [shoutOut]);

  useEffect(() => {
    selectedLayoutRef.current = selectedLayout;
  }, [selectedLayout]);

  useEffect(() => {
    enableCamera();
  }, []);

  useEffect(() => {
    return () => {
      cancelAnimationFrame(requestAnimationRef.current);
    };
  }, []);

  return (
    <div style={{ maxWidth: "980px", margin: "0 auto" }}>
      <Head>
        <title>Stream</title>
      </Head>
      <h1>Stream</h1>

      {!cameraEnabled && (
        <button className="button button-outline" onClick={enableCamera}>
          Enable Camera
        </button>
      )}

      {cameraEnabled &&
        (streaming ? (
          <div>
            <span>{connected ? "Connected" : "Disconnected"}</span>
            <button className="button button-outline" onClick={stopStreaming}>
              Stop Streaming
            </button>
          </div>
        ) : (
          <>
            <input
              placeholder="Stream Key"
              type="text"
              onChange={(e) => setStreamKey(e.target.value)}
            />
            <button
              className="button button-outline"
              disabled={!streamKey}
              onClick={startStreaming}
            >
              Start Streaming
            </button>
          </>
        ))}
      <div className="row">
        <div className="column">
          <h2>Input</h2>
          <video
            ref={videoRef}
            controls
            width="100%"
            height="auto"
            muted
          ></video>
        </div>
        <div className="column">
          <h2>Output</h2>
          <canvas ref={canvasRef}></canvas>
          <input
            placeholder="Shout someone out!"
            type="text"
            onChange={(e) => setShoutOut(e.target.value)}
          />
          <div>
            <button
              className="button button-outline"
              onClick={() => setSelectedLayout("none")}
            >
              None
            </button>
            <button
              className="button button-outline"
              onClick={() => setSelectedLayout("topLeft")}
            >
              Top Left
            </button>
            <button
              className="button button-outline"
              onClick={() => setSelectedLayout("topRight")}
            >
              Top Right
            </button>
            <button
              className="button button-outline"
              onClick={() => setSelectedLayout("bottomLeft")}
            >
              Bottom Left
            </button>
            <button
              className="button button-outline"
              onClick={() => setSelectedLayout("bottomRight")}
            >
              Bottom Right
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
