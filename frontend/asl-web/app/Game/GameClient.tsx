'use client'
import { useRouter, useSearchParams} from 'next/navigation';
import React, { useState, useRef, useEffect  } from 'react';
import axios from "axios";
import Image from 'next/image'; 

const fruitList = ['APPLE', 'BANANA', 'LEMON', 'ORANGE', 'KIWI', 'BLUEBERRY', 'WATERMELON', 
  'COCONUT', 'LIME', 'LYCHEE', 'STRAWBERRY', 'PINEAPPLE', 'PAPAYA', 'PLUM', 'PEACH', 'APRICOT', 'PEAR', 'CHERRY','DATE'];
const veggieList = ['ARTICHOKE', 'BROCCOLI', 'CABBAGE', 'CAULIFLOWER', 'CELERY', 'EGGPLANT', 'KALE', 'LETTUCE',
  'MUSHROOM', 'TOMATO', 'OKRA', 'CUCUMBER', 'POTATO', 'PEA', 'ONION', 'CORN', 'RADISH']; 
const animalList = ['DOG', 'CAT', 'FISH', 'RABBIT', 'BIRD', 'HAMSTER', 'TIGER', 'LION', 'ELEPHANT', 'HORSE', 'BEAR'];

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
  const [showRules, setShowRules] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  // start webcam 
  useEffect(() => {
    let stream: MediaStream;
  
    async function startCamera() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: true });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
  
          // Delay play slightly to avoid AbortError on fast refresh
          setTimeout(() => {
            videoRef.current?.play().catch((e) => {
              console.warn("video play() failed:", e.message);
            });
          }, 200);
        }
      } catch (err) {
        console.error("webcam access error", err);
      }
    }
    startCamera();
    // Cleanup on unmount
    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);
  
  

  // capture + predict 
  const captureAndPredict = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
  
    if (video.videoWidth === 0 || video.videoHeight === 0) {
      console.warn("Video dimensions not ready yet");
      return;
    }
  
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  
    canvas.toBlob(async (blob) => {
      if (!blob || blob.size === 0) {
        console.error("Blob is empty. Capture failed.");
        return;
      }
      console.log("Blob size: ", blob.size);
      console.log("Blob type: ", blob.type);
      const formData = new FormData();
      formData.append("file", blob, "capture.jpg");
  
      try {
        const response = await axios.post<{ prediction?: string, error?: string }>(
          'http://asl-hangman-env.eba-vmtjbx9u.us-west-2.elasticbeanstalk.com/predict',
          formData);
        console.log("Predict response:", response.data);
        if (response.data.error) {
          console.warn("Prediction failed:", response.data.error);
          setPredictLetter('');
        } else {
          const letter = response.data.prediction || "";
          setPredictLetter(letter.toUpperCase());
        }
  
      } catch (error) {
        console.error("Prediction request error:", error);
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
      const response = await axios.post(`http://asl-hangman-env.eba-vmtjbx9u.us-west-2.elasticbeanstalk.com/players/${username}/add-points/`);
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
  }, [gameWon, addPoints]); 
  
  return (
    <div className="text-center font-gummy text-lg h-screen md:my-2">
      <nav className="flex justify-end">
        <ul className="flex flex-row px-4 gap-2 md:text-xl">
          <button onClick={() => setShowRules(true)}>Rules</button>
          <button onClick={() => setShowGuide(true)}>Guide</button>
          <button onClick={() => setShowHelp(true)}>Help</button>
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
      <div className="md:mt-30">
      {gameWon && <p className="text-xl mb-2"> <span className="text-green-600 font-bold ">Correct&nbsp;you win.</span> <br/> Play again or Change modes in main menu.</p>}
      {gameLost && <p className="text-xl mb-2"> <span className="text-red-600 font-bold ">Game Over, the word was {target}. </span> <br/> Play again or Switch to learn mode.</p>}
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
      </div>
      </div>
    </div>
    {/* rules pop-up */}
{showRules && (
  <div className="fixed inset-0 z-50 backdrop-blur-lg flex items-center justify-center">
    <div className="bg-white rounded-lg p-6 w-10/12 max-h-[80vh] overflow-y-auto shadow-xl">
      <h2 className="text-2xl font-bold mb-2">Rules</h2>
      <p className="text-base md:text-lg">
        Guess the ASL letters to complete the word. You have 6 attempts. <br/>
        1. There is a random secret word associated with the category. Try to guess it before attempts run out to win! <br/>
        2. Use the ASL Alphabet Sign guide to guess the letter.  <br/>
        3. Select learn mode to be guided through the alphabets and select play mode to practice. <br/>
      </p>
      <button onClick={() => setShowRules(false)} className="mt-4 px-4 py-2 bg-[#f4d6da] bg-opacity-50 text-[#5f4842] border-1 rounded-lg">
        Close
      </button>
    </div>
  </div>
)}

{/* guide pop-up */}
{showGuide && (
  <div className="fixed inset-0 z-50 backdrop-blur-lg flex items-center justify-center">
    <div className="bg-white rounded-lg p-6 w-10/12 max-h-[80vh] overflow-y-auto shadow-xl">
      <h2 className="text-2xl font-bold mb-4">Guide</h2>
      <p className="text-base md:text-lg">
        Use your webcam to sign a letter. Click &quot;Make Guess&quot; to predict and &quot;Enter Guess&quot; to send prediction. <br/>
        <Image
        src="/aslaz/mainaz.jpg"
        width={220}
        height={200}
        alt="ASL Fingerspelling chart"
        className="mx-auto my-2"/>
      </p>
      <button onClick={() => setShowGuide(false)} className="mt-4 px-4 py-2 bg-[#f4d6da] bg-opacity-50 text-[#5f4842] border-1 rounded-lg">
        Close
      </button>
    </div>
  </div>
)}

{/* help pop-up */}
{showHelp && (
  <div className="fixed inset-0 z-50 backdrop-blur-lg flex items-center justify-center">
    <div className="bg-white rounded-lg p-6 w-10/12 max-h-[80vh] overflow-y-auto shadow-xl">
      <h2 className="text-2xl font-bold mb-2">Help</h2>
      <p className="text-base mb-2 md:text-lg">
        Make sure the webcam is on, hand and fingers are clearly visible. <br/>
        For a description of how to make the ASL hand gestures, check out: </p>
        <a href="https://www.deafblind.com/asl.html" target="_blank" rel="noopener noreferrer"
        className="text-blue-600 underline hover:text-blue-800"> https://www.deafblind.com/asl.html </a> <br/>
      <button onClick={() => setShowHelp(false)} className="mt-3 px-4 py-2 bg-[#f4d6da] bg-opacity-50 text-[#5f4842] border-1 rounded-lg">
        Close
      </button>
    </div>
  </div>
)}
    </div>
  );
}