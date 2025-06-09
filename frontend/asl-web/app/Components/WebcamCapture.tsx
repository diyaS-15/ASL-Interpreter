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
    }, "image/jpeg");
  };

  return (
    <div className="flex flex-col items-center">
      <video
        ref={videoRef}
        className="w-150 border-1 border-solid border-black rounded-lg"
        autoPlay
        muted
        playsInline
      />
      <canvas ref={canvasRef} className="hidden" />
      <button onClick={captureAndPredict} className="mt-4 border-2 p-1 rounded-lg bg-[#d8ebe5] text-[#83c0ae]"> Make Guess</button>
    </div>
  );
}

