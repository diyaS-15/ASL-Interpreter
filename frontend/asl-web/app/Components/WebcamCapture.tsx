'use client';
import React, { useRef, useState, useEffect } from "react";
import axios from "axios";

// axios helps make API requests 

// interface = structure of object, tells WebcamCapture needs onPredict function
interface WebcamCaptureProps {
  onPredict: (letter: string) => void; 
}

export default function WebcamCapture({ onPredict }: WebcamCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null); // webcam input
  const canvasRef = useRef<HTMLCanvasElement>(null); // frame capture
  const [loading, setLoading] = useState<boolean>(false); 

  useEffect(() => {
    async function startCamera() {
      try {
        // accesses webcam + connects w/ videoRef 
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
      } catch (err) {
        console.error("Error accessing webcam:", err);
      }
    }

    startCamera();
  }, []);

  const captureAndPredict = () => {
    setLoading(true);
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    // converts to raw image data 
    canvas.toBlob(async (blob) => {
      if (!blob) {
        setLoading(false);
        return;
      }
      // post request to predict
      try {
        const formData = new FormData();
        formData.append("file", blob, "capture.jpg");
        const response = await axios.post<{ prediction?: string }>(
          "http://localhost:8000/predict/",
          formData,
          {
            headers: { "Content-Type": "multipart/form-data" },
          }
        );
        const letter = response.data.prediction || "";
        onPredict(letter); // send result home
      } catch (error) {
        console.error("Prediction error:", error);
        onPredict("");
      }
      setLoading(false);
    }, "image/jpeg");
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
      <video
        ref={videoRef}
        style={{ width: 500, border: "1px solid black", borderRadius: 8 }}
        autoPlay
        muted
        playsInline
      />
      <canvas ref={canvasRef} style={{ display: "none" }} />
      <button onClick={captureAndPredict} disabled={loading} style={{ marginTop: 10 }}>
        {loading ? "Predicting..." : "Make guess"}
      </button>
    </div>
  );
}

