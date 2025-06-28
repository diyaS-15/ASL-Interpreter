'use client';
import { useRouter, useSearchParams } from 'next/navigation';
import React, { useState, useRef, useEffect } from 'react';
import axios from "axios";
import Image from 'next/image';
import Link from 'next/link';

const fruitList = ['APPLE', 'BANANA', 'LEMON', 'ORANGE', 'KIWI', 'BLUEBERRY', 'WATERMELON', 
  'COCONUT', 'LIME', 'LYCHEE', 'STRAWBERRY', 'PINEAPPLE', 'PAPAYA', 'PLUM', 'PEACH', 'APRICOT', 'PEAR', 'CHERRY','DATE'];
const veggieList = ['ARTICHOKE', 'BROCCOLI', 'CABBAGE', 'CAULIFLOWER', 'CELERY', 'EGGPLANT', 'KALE', 'LETTUCE',
  'MUSHROOM', 'TOMATO', 'OKRA', 'CUCUMBER', 'POTATO', 'PEA', 'ONION', 'CORN', 'RADISH'];
const animalList = ['DOG', 'CAT', 'FISH', 'BUNNY', 'BIRD', 'HAMSTER'];

function getRandomWord(category: string | null) {
  let list: string[] = [];
  if (category === 'fruits') list = fruitList;
  else if (category === 'veggies') list = veggieList;
  else if (category === 'animals') list = animalList;
  const randIndex = Math.floor(Math.random() * list.length);
  return list[randIndex];
}

export default function LearnPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const category = searchParams.get('category');
  const handelPrev = () => {
    router.push(`/`);
  };

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [target, setTarget] = useState(() => getRandomWord(category));
  const [blanks, setBlanks] = useState(Array(target.length).fill('_'));
  const [currentTargetLetter, setCurrentTargetLetter] = useState<string>('');
  const [attempts, setAttempts] = useState(6);
  const [predictedLetter, setPredictedLetter] = useState<string>('');
  const [message, setMessage] = useState<string>('');

  useEffect(() => {
    async function startCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
      } catch (err) {
        console.error("webcam access error", err);
      }
    }
    startCamera();
    // Initialize first letter to predict
    const firstIndex = Array(target.length).fill('_').findIndex((c, i) => target[i] !== ' ');
    if (firstIndex !== -1) {
      setCurrentTargetLetter(target[firstIndex]);
    }
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
    canvas.toBlob(async (blob) => {
      if (!blob) return;
      try {
        const formData = new FormData();
        formData.append("file", blob, "capture.jpg");
        const response = await axios.post<{ prediction?: string }>(
          "http://localhost:8000/predict/",
          formData,
          { headers: { "Content-Type": "multipart/form-data" } }
        );
        const letter = response.data.prediction?.toUpperCase() || '';
        setPredictedLetter(letter);
        if (letter === currentTargetLetter) {
          // Correct!
          const newBlanks = blanks.map((char, i) =>
            target[i] === letter ? letter : char
          );
          setBlanks(newBlanks);
          setMessage(`Correct! Letter "${letter}" revealed.`);
          // Find next letter
          const nextIndex = newBlanks.findIndex((c, i) => c === '_');
          if (nextIndex !== -1) {
            setCurrentTargetLetter(target[nextIndex]);
          } else {
            setCurrentTargetLetter(''); // All letters revealed
          }
        } else {
          setAttempts(prev => prev - 1);
          setMessage(`Try again! You showed "${letter}".`);
        }
      } catch (error) {
        console.error("Prediction error:", error);
        setPredictedLetter('');
        setMessage('Prediction failed. Please try again.');
      }
    }, "image/jpeg");
  };

  const handleNewGame = () => {
    const newWord = getRandomWord(category);
    setTarget(newWord);
    setBlanks(Array(newWord.length).fill('_'));
    setAttempts(6);
    setPredictedLetter('');
    setMessage('');
    const firstIndex = newWord.split('').findIndex((c) => c !== ' ');
    if (firstIndex !== -1) {
      setCurrentTargetLetter(newWord[firstIndex]);
    }
  };

  const gameWon = blanks.join('') === target;
  const gameLost = attempts <= 0;

  return (
    <div className="text-center font-gummy text-lg h-screen md:my-2">
      <nav className="flex justify-end">
        <ul className="flex flex-row px-4 gap-2">
          <Link href="/Rules">Rules</Link>
          <Link href="/Rules">Guide</Link>
          <Link href="/Rules">Help</Link>
        </ul>
      </nav>
      <div className="p-4 md:grid md:grid-cols-2">
        <h1 className="hidden text-6xl m-8 font-bold md:mb-6">ASL Hangman Guided</h1>
        <div className="relative">
          <video
            ref={videoRef}
            className="w-130 border-1 border-solid border-black rounded-lg mx-auto"
            autoPlay
            muted
            playsInline
          />
          {currentTargetLetter && (
            <div className="absolute top-2 left-3 lg:left-21 bg-white bg-opacity-80 rounded p-1 shadow-md">
              <Image
                src={`/aslaz/${currentTargetLetter}.jpg`}
                width={100}
                height={100}
                alt={`ASL ${currentTargetLetter}`}
              />
            </div>
          )}
          <canvas ref={canvasRef} className="hidden" />
          <div className="flex flex-row justify-between my-4 md:mx-14">
            <div>
              <p className="text-xl">Expected Letter: <strong>{currentTargetLetter}</strong></p>
              {predictedLetter && (
                <p>Last Prediction: <strong>{predictedLetter}</strong></p>
              )}
            </div>
            <div>
              <button
                onClick={captureAndPredict}
                disabled={gameWon || gameLost || !currentTargetLetter}
                className=" border-2 p-1 rounded-lg bg-[#d8ebe5] text-[#83c0ae]"
              >
                Confirm Sign
              </button>
            </div>
          </div>
          {message && <p className="mt-2">{message}</p>}
        </div>
        <div>
          {gameWon && <p className="text-green-600 font-bold text-xl mb-2">You completed the word!</p>}
          {gameLost && <p className="text-red-600 font-bold text-xl mb-2">Try Again. The word was {target}</p>}
          <div>
            <p className="text-4xl m-4">{blanks.join(' ')}</p>
            <p className="font-medium">Attempts Left: {attempts}</p>
          </div>
          <div className="my-4">
            <button onClick={handleNewGame} className="mr-2 border-2 bg-[#f4d6da] p-1 rounded-lg text-[#ef8a9b]">New Game</button>
            <button onClick={handelPrev} className="border-2 bg-[#f4d6da] p-1 rounded-lg text-[#ef8a9b]">Main Menu</button>
          </div>
          <Image
            src="/asl_az.jpeg"
            width={400}
            height={400}
            alt="ASL Fingerspelling chart"
            className="invisible md:ml-30 md:visible"
          />
        </div>
      </div>
    </div>
  );
}
