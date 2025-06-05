'use client';
import React, { useState } from 'react';
import WebcamCapture from "./Components/WebcamCapture";
import Image from 'next/image'

const fruitList = ['APPLE', 'BANANA', 'LEMON', 'ORANGE', 'KIWI', 'BLUEBERRY', 'WATERMELON', 
  'COCONUT', 'LIME', 'LYCHEE', 'STRAWBERRY', 'PINEAPPLE', 'PAPAYA', 'PLUM', 'PEACH', 'APRICOT', 'PEAR', 'CHERRY',
'DATE'];
const veggieList = ['ARTICHOKE', 'BROCCOLI', 'CABBAGE', 'CAULIFLOWER', 'CELERY', 'EGGPLANT', 'KALE', 'LETTUCE',
  'MUSHROOM', 'TOMATO', 'OKRA', 'CUCUMBER', 'POTATO', 'PEA', 'ONION', 'CORN', 'RADISH']; 

function getRandomWord() {
  const randIndex = Math.floor(Math.random() * fruitList.length);
  return fruitList[randIndex];
  // #bcc99f #f0ccd1
}

export default function Home() {
  // sets initial vars
  const [target, setTarget] = useState(getRandomWord());
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
    const newWord = getRandomWord();
    setTarget(newWord);
    setBlanks(Array(newWord.length).fill('_'));
    setGuessedLetters([]);
    setAttempts(6);
    setPredictLetter('');
  };

  const gameWon = blanks.join('') === target;
  const gameLost = attempts <= 0;

  return (
    <div className="text-center p-4">
      <h1 className="text-3xl font-bold mb-6">ASL Hangman</h1>
      {gameWon && <p className="text-green-600 font-bold text-xl">Correct! you win</p>}
      {gameLost && <p className="text-red-600 font-bold text-xl">Game over. The word was {target}</p>}
      <button onClick={handleNewGame} className="border-4 bg-gray-400 p-2 rounded-lg">New Game </button>
      <div className="md:grid grid-cols-2 md:mx-8">
      <div>
      <p className="text-2xl mb-4">{blanks.join(' ')}</p>
      <p className="mb-2">Attempts Left: {attempts}</p> {/* remove + replace w/ hangman figure later */}
      <p className="mb-4">Guessed Letters: {guessedLetters.join(', ')}</p> {/* improve this UI, maybe put these under hangman in cute box */}
      <Image
      src="/asl_az.jpeg"
      width={500}
      height={500}
      alt="ASL Fingerspelling chart"
      className="md:ml-8"/>
      </div>
      <div className="mt-10">
        <WebcamCapture onPredict={handleGuess} />
        <p className="mt-4">Predicted Letter: <strong>{predictedLetter}</strong></p>
        <button onClick={handleConfirmLetter} disabled={!predictedLetter || guessedLetters.includes(predictedLetter.toUpperCase()) ||
            gameWon || gameLost} className="border-4 bg-gray-400 p-2 rounded-lg"> Enter guess </button>

      </div>
      </div>
    </div>
  );
}

