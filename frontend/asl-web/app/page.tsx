'use client'
import { useRouter} from 'next/navigation';
import { useState, useEffect } from 'react';
import { Play, Trophy } from "lucide-react";
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
    const [showLeaderboard, setShowLeaderboard] = useState(false); 
    const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;
    
    const handelPlay = async() => {
      if (!mode || !category || !username){
        alert("Must enter name, chose category & mode to continue");
        return;
      }
      try{
        const response = await axios.post(`${BASE_URL}/players/`, {
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
      axios.get(`${BASE_URL}/leaderboard/`)
      .then(response => setLeaderboard(response.data))
      .catch(error => console.error("failed to load leaderboard:", error));
    }, [])


    return(
        <div className="h-screen text-center font-gummy">
          <nav className="md:hidden mt-2 flex justify-end px-6">
            <button onClick={() => setShowLeaderboard(true)}> <Trophy size={28}/> </button>
          </nav>
          <div className="md:mr-55">
            <h1 className="text-6xl mt-0 m-6 font-bold md:mt-13"> ASL Hangman</h1>
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
            <button  onClick={handelPlay} className="fixed bottom-4 right-14 bottom-10 w-14 h-14 flex items-center 
            justify-center bg-[#fef6d8] hover:bg-[#fceba4] rounded-lg border-2 border-[#e6c269] text-[#e6c269] md:hidden">
                <Play className="text-[#e6c269]" size={26} />
            </button>
            <div className="hidden md:flex flex-col items-center justify-center mt-20">
              <button onClick={handelPlay} className="w-30 h-14 flex items-center justify-center bg-[#fef6d8] hover:bg-[#fceba4] rounded-lg border-2 border-[#e6c269] text-[#e6c269] text-2xl">
                Play <Play className="text-[#e6c269] ml-4" size={26} /> </button>
                </div>
                </div>
<div className="hidden md:block absolute top-12 right-10 w-100 h-150 bg-white rounded-lg shadow-md p-4">
  <h2 className="text-2xl font-bold mb-4">Leaderboard</h2>
  <ul className="text-lg">
    {leaderboard.map((player, index) => (
      <li key={player.username} className="flex justify-between items-center px-2 border-stone-400 border-1">
      <span className="w-1/10 text-left font-semibold border-r">{index + 1}.</span>
      <span className="w-7/10 text-left truncate pl-3">{player.username}</span>
      <span className="w-2/10 text-left border-l pl-2">{player.points} pts</span>
    </li>
    ))}
  </ul>
</div>
{showLeaderboard && (
  <div className="fixed inset-0 z-50 backdrop-blur-xs flex items-center justify-center md:hidden">
    <div className="bg-white rounded-lg p-6 w-10/12 max-h-[80vh] overflow-y-auto shadow-xl">
      <h2 className="text-3xl font-bold mb-4">Leaderboard</h2>
      <ul className="text-lg">
        {leaderboard.map((player, index) => (
          <li key={player.username} className="flex justify-between items-center px-2 border-stone-400 border-1">
          <span className="w-1/10 text-left font-semibold border-r">{index + 1}.</span>
          <span className="w-7/10 text-left truncate pl-3">{player.username}</span>
          <span className="w-2/10 text-left border-l pl-2">{player.points} pts</span>
        </li>
        ))}
      </ul>
      <button onClick={() => setShowLeaderboard(false)} className="mt-4 px-4 py-2 bg-[#f4d6da] bg-opacity-50 text-[#5f4842] border-1 rounded-lg">
        Close
      </button>
    </div>
  </div>
)}

</div>

    );
};


