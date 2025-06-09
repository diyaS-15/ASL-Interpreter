'use client'
import { useRouter} from 'next/navigation';
import { useState } from 'react';
import { Play } from "lucide-react";

export default function Home() {
    const router = useRouter(); 
    const [mode, setMode] = useState(''); 
    const [category, setCategory] = useState(''); 
    
    const handelPlay = () => {
      if (!mode || !category){
        alert("Must chose category & mode to continue");
        return;
      }
      router.push(`/Rules?mode=${mode}&category=${category}`);
    };

    const toggleMode = (selectedMode) => {
      setMode((prev) => (prev === selectedMode ? '' : selectedMode)); 
    };
    const toggleCategory = (selectedCat) => {
      setCategory((prev) => (prev === selectedCat ? '': selectedCat)); 
    };

    return(
        <div className="h-screen text-center font-gummy">
            <h1 className="text-6xl m-8 font-bold md:mb-6">ASL Hangman</h1>
            <p className="text-lg"> ~Select Mode~ </p>
            <div className="flex flex-col items-center gap-4 my-4 content-center">
            <button onClick={() => toggleMode('learn')} className={`text-[#ef8a9b] hover:bg-[#f1c0c8] border-2 w-40 h-12 rounded-lg text-2xl transition-colors duration-200
            ${mode === 'learn' ? 'bg-[#f1c0c8]' : 'bg-[#f4d6da]' }
            `}> Learn </button>
            <button onClick={() => toggleMode('play')} className={`text-[#ef8a9b] hover:bg-[#f1c0c8] border-2 w-40 h-12 rounded-lg text-2xl transition-colors duration-200
            ${mode === 'play' ? 'bg-[#f1c0c8]' : 'bg-[#f4d6da]' }
            `}> Play </button>
            </div>
            <p className="text-lg mt-10"> ~Select Category~ </p>
            <div className="flex flex-col items-center gap-4 my-4 content-center">
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
            <button  onClick={handelPlay} className="fixed bottom-4 right-14 bottom-10 w-14 h-14 flex items-center justify-center bg-[#fef6d8] hover:bg-[#fceba4] rounded-lg border-2 border-[#e6c269] text-[#e6c269]">
                <Play className="text-[#e6c269]" size={26} />
            </button>
        </div>
    );
};

