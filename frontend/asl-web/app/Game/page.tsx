'use client'
import { useRouter, useSearchParams} from 'next/navigation';
import React, { useState, useRef, useEffect  } from 'react';
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
    if(category === 'fruits') list = fruitList; 
    else if(category === 'veggies') list = veggieList; 
    else if(category === 'animals') list = animalList; 
  const randIndex = Math.floor(Math.random() * list.length);
  return list[randIndex];
}

export default function GamePage() {
  // routing + get categories
  const router = useRouter(); 
  const searchParams = useSearchParams(); 
  const mode = searchParams.get('mode');
  const category = searchParams.get('category');
  const username = searchParams.get('username');
  const handelPrev = () => {
    router.push(`/`);
  };
  // webcam + captured frame 
  const videoRef = useRef<HTMLVideoElement>(null); 
  const canvasRef = useRef<HTMLCanvasElement>(null); 
   // sets game initial vars
  const [target, setTarget] = useState(() => getRandomWord(category));
  const [blanks, setBlanks] = useState(Array(target.length).fill('_'));
  const [guessedLetters, setGuessedLetters] = useState<string[]>([]);
  const [attempts, setAttempts] = useState(6);
  const [predictedLetter, setPredictLetter] = useState<string>('');

  // start webcam 
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
        console.error("webcam access error", err);
      }
    }
    startCamera();
  }, []);

  // capture + predict 
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
      // sends to backend endpoint w/ axios 
      try {
        const formData = new FormData();
        formData.append("file", blob, "capture.jpg");
        const response = await axios.post<{ prediction?: string }>(
          "http://localhost:8000/predict/",
          formData,
          { headers: { "Content-Type": "multipart/form-data" } }
        );
        const letter = response.data.prediction || "";
        setPredictLetter(letter.toUpperCase());
      } catch (error) {
        console.error("Prediction error:", error);
        setPredictLetter('');
      }
    }, "image/jpeg");
  };

  // checks if guess valid
  const handleConfirmLetter = () => {
    const guess = predictedLetter.toUpperCase();
    if (!guess || guessedLetters.includes(guess)) return;
    setGuessedLetters(prev => [...prev, guess]);
    if (target.includes(guess)) {
      const newBlanks = blanks.map((char, i) => target[i] === guess ? guess : char);
      setBlanks(newBlanks);
    } else {
      setAttempts(prev => prev - 1);
    }
    setPredictLetter('');
  };

  // handels new game/restart
  const handleNewGame = () => {
    const newWord = getRandomWord(category);
    setTarget(newWord);
    setBlanks(Array(newWord.length).fill('_'));
    setGuessedLetters([]);
    setAttempts(6);
    setPredictLetter('');
  };

  const addPoints = async() => {
    if(!username) return; 
    try{
      const response = await axios.post(`http://127.0.0.1:8000/players/${username}/add-points/`);
      console.log("points added:", response.data)
    } catch (error){
      console.log("points not added:", error)
    }
  };
  
  const gameWon = blanks.join('') === target;
  const gameLost = attempts <= 0;

  useEffect(() => {
    if (gameWon){
      addPoints();
    }
  }, [gameWon]); 
  
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
      <h1 className="hidden text-6xl m-8 font-bold md:mb-6">ASL Hangman</h1>
      <div>
      <video
        ref={videoRef}
        className="w-130 border-1 border-solid border-black rounded-lg mx-auto"
        autoPlay
        muted
        playsInline
      />
      <canvas ref={canvasRef} className="hidden" />
      <div className="flex flex-row justify-between my-4 md:mx-14">
        <div>
        <p className="text-xl">Predicted Letter: <strong>{predictedLetter}</strong></p>
        </div>
        <div className="">
          <button onClick={captureAndPredict} className=" border-2 p-1 rounded-lg bg-[#d8ebe5] text-[#83c0ae] mr-3">Make Guess</button>
          <button onClick={handleConfirmLetter} disabled={!predictedLetter || guessedLetters.includes(predictedLetter.toUpperCase()) ||
            gameWon || gameLost} className=" border-2 p-1 rounded-lg bg-[#d8ebe5] text-[#83c0ae]"> Enter guess </button>
        </div>
      </div>
      </div>
      <div>
      {gameWon && <p className="text-green-600 font-bold text-xl mb-2">Correct! you win</p>}
      {gameLost && <p className="text-red-600 font-bold text-xl mb-2">Game over. The word was {target}</p>}
      <div className="">
      <div>
      <p className="text-4xl m-4 ">{blanks.join(' ')}</p>
      <p className="font-medium">Guessed Letters: {guessedLetters.join(', ')}</p>
      <p className="font-medium">Attempts Left: {attempts}</p> {/* remove + replace w/ hangman figure later */}
      </div>
      <div className="my-4">
      <button onClick={handleNewGame} className="mr-2 border-2 bg-[#f4d6da] p-1 rounded-lg text-[#ef8a9b]">New Game </button>
      <button onClick={handelPrev} className="border-2 bg-[#f4d6da] p-1 rounded-lg text-[#ef8a9b]">Main Menu</button>
      </div>
      <Image
      src="/asl_az.jpeg"
      width={400}
      height={400}
      alt="ASL Fingerspelling chart"
      className="invisible md:ml-30 md:visible"/>
      </div>
      </div>
    </div>
    </div>
  );
}