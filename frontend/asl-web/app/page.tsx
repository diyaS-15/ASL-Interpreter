'use client'
import { useRouter} from 'next/navigation';
import { useState, useEffect } from 'react';
import { Play } from "lucide-react";
import axios from 'axios';

export default function Home() {
    const router = useRouter(); 
    const [mode, setMode] = useState(''); 
    const [category, setCategory] = useState(''); 
    const [username, setUsername] = useState('');
    type Player = {
      username: string;
      points: number;
    };
    const [leaderboard, setLeaderboard] = useState<Player[]>([]);
    
    const handelPlay = async() => {
      if (!mode || !category || !username){
        alert("Must enter name, chose category & mode to continue");
        return;
      }
      try{
        const response = await axios.post("http://127.0.0.1:8000/players/", {
          username: username, 
        }); 
        const player = response.data; 
        console.log("logged in as:", player);
        router.push(`/Rules?mode=${mode}&category=${category}&username=${username}`);
      } catch (error){
        console.error("error with player login/singup:", error);
        alert("Try again.");
      }
    };

    const toggleMode = (selectedMode: string) => {
      setMode((prev) => (prev === selectedMode ? '' : selectedMode)); 
    };
    const toggleCategory = (selectedCat: string ) => {
      setCategory((prev) => (prev === selectedCat ? '': selectedCat)); 
    };

    useEffect(() => {
      axios.get("http://127.0.0.1:8000/leaderboard/")
      .then(response => setLeaderboard(response.data))
      .catch(error => console.error("failed to load leaderboard:", error));
    }, [])


    return(
        <div className="h-screen text-center font-gummy">
            <h1 className="text-6xl m-6 font-bold md:mt-15">ASL Hangman</h1>
            <input value={username} onChange={(e) => setUsername(e.target.value)}
            placeholder="Enter Username" className="bg-white text-xl text-center border-[#c8b5b0] border-2 rounded-lg md:mt-2 mb-6 md:px-4 md:py-1"/>
            <p className="text-lg md:mt-2"> ~Select Mode~ </p>
            <div className="flex flex-col items-center gap-4 my-4 justify-center md:flex-row">
            <button onClick={() => toggleMode('learn')} className={`text-[#ef8a9b] hover:bg-[#f1c0c8] border-2 w-40 h-12 rounded-lg text-2xl transition-colors duration-200
            ${mode === 'learn' ? 'bg-[#f1c0c8]' : 'bg-[#f4d6da]' }
            `}> Learn </button>
            <button onClick={() => toggleMode('play')} className={`text-[#ef8a9b] hover:bg-[#f1c0c8] border-2 w-40 h-12 rounded-lg text-2xl transition-colors duration-200
            ${mode === 'play' ? 'bg-[#f1c0c8]' : 'bg-[#f4d6da]' }
            `}> Play </button>
            </div>
            <p className="text-lg mt-8"> ~Select Category~ </p>
            <div className="flex flex-col items-center gap-4 my-4 justify-center md:flex-row">
            <button onClick={() => toggleCategory('fruits')} className={`border-2  w-40 h-12 rounded-lg text-2xl text-[#83c0ae] hover:bg-[#bcd9cd] transition-colors duration-200
            ${category === 'fruits' ? 'bg-[#bcd9cd]' : 'bg-[#d8ebe5]' }
            `}> Fruits </button>
            <button onClick={() => toggleCategory('veggies')} className={`border-2  w-40 h-12 rounded-lg text-2xl text-[#83c0ae] hover:bg-[#bcd9cd] transition-colors duration-200
            ${category === 'veggies' ? 'bg-[#bcd9cd]' : 'bg-[#d8ebe5]' }
            `}> Veggies </button>
            <button onClick={() => toggleCategory('animals')} className={`border-2  w-40 h-12 rounded-lg text-2xl text-[#83c0ae] hover:bg-[#bcd9cd] transition-colors duration-200
            ${category === 'animals' ? 'bg-[#bcd9cd]' : 'bg-[#d8ebe5]' }
            `}> Animals </button>
            </div>
            <button  onClick={handelPlay} className="fixed bottom-4 right-14 bottom-10 w-14 h-14 flex items-center justify-center bg-[#fef6d8] hover:bg-[#fceba4] rounded-lg border-2 border-[#e6c269] text-[#e6c269] md:hidden">
                <Play className="text-[#e6c269]" size={26} />
            </button>
            <div className="hidden md:flex flex-col items-center justify-center mt-12">
              <button onClick={handelPlay} className="w-30 h-14 flex items-center justify-center bg-[#fef6d8] hover:bg-[#fceba4] rounded-lg border-2 border-[#e6c269] text-[#e6c269] text-2xl">
                Play <Play className="text-[#e6c269] ml-4" size={26} /> 
                </button>
                </div>
                <div className="mt-12 px-4 md:px-0">
                  <h2 className="text-2xl font-bold mb-4"> Leaderboard</h2>
                  <ul className="text-lg">
                    {leaderboard.map((player, index) => (
                      <li key={player.username} className="my-1">
                        {index + 1}. {player.username} — {player.points} pts
                        </li>
                      ))}
                      </ul>
                      </div>
                </div>
    );
};

