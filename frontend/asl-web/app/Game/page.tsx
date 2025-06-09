'use client'
import { useRouter, useSearchParams} from 'next/navigation';
import React, { useState } from 'react';
import WebcamCapture from "../Components/WebcamCapture";
import Image from 'next/image'

const fruitList = ['APPLE', 'BANANA', 'LEMON', 'ORANGE', 'KIWI', 'BLUEBERRY', 'WATERMELON', 
  'COCONUT', 'LIME', 'LYCHEE', 'STRAWBERRY', 'PINEAPPLE', 'PAPAYA', 'PLUM', 'PEACH', 'APRICOT', 'PEAR', 'CHERRY',
'DATE'];
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
    const handelPrev = () => {
        router.push(`/`);
    };

  // sets game initial vars
  const [target, setTarget] = useState(() => getRandomWord(category));
  const [blanks, setBlanks] = useState(Array(target.length).fill('_'));
  const [guessedLetters, setGuessedLetters] = useState<string[]>([]);
  const [attempts, setAttempts] = useState(6);
  const [predictedLetter, setPredictLetter] = useState<string>('');

  // handles new predict from webcam
  const handleGuess = (letter: string) => {
    setPredictLetter(letter.toUpperCase());
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
  
  const gameWon = blanks.join('') === target;
  const gameLost = attempts <= 0;
  
  return (
    <div className="text-center p-4 font-gummy text-lg md:my-6">
      <h1 className="hidden text-6xl m-8 font-bold md:mb-6">ASL Hangman</h1>
      {gameWon && <p className="text-green-600 font-bold text-xl mb-2">Correct! you win</p>}
      {gameLost && <p className="text-red-600 font-bold text-xl mb-2">Game over. The word was {target}</p>}
      <button onClick={handleNewGame} className="border-2 bg-[#f4d6da] p-2 rounded-lg text-[#ef8a9b]">New Game </button>
      <div className="md:grid grid-cols-2 md:mx-8">
      <div>
      <p className="text-3xl mb-4 ">{blanks.join(' ')}</p>
      <p className="mb-2 font-medium">Attempts Left: {attempts}</p> {/* remove + replace w/ hangman figure later */}
      <p className="mb-4 font-medium">Guessed Letters: {guessedLetters.join(', ')}</p>
      <Image
      src="/asl_az.jpeg"
      width={500}
      height={500}
      alt="ASL Fingerspelling chart"
      className="hidden md:ml-8"/>
      </div>
      <div className="mt-10">
        <WebcamCapture onPredict={handleGuess} />
        <p className="mt-4 text-xl mb-2">Predicted Letter: <strong>{predictedLetter}</strong></p>
        <button onClick={handleConfirmLetter} disabled={!predictedLetter || guessedLetters.includes(predictedLetter.toUpperCase()) ||
            gameWon || gameLost} className="border-2 p-2 rounded-lg bg-[#d8ebe5] text-[#83c0ae] "> Enter guess </button>
      </div>
      <button onClick={handelPrev}>Main Menu</button>
      </div>
    </div>
  );
}