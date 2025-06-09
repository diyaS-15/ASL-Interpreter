'use client'
import { useRouter, useSearchParams} from 'next/navigation';
import {ChevronRight, ChevronLeft} from 'lucide-react';
import Image from 'next/image'

export default function Rules() {
    const router = useRouter(); 
    const searchParams = useSearchParams(); 
    const mode = searchParams.get('mode');
    const category = searchParams.get('category');
    
    const handelNext = () => {
        router.push(`/Game?mode=${mode}&category=${category}`);
    };
    const handelPrev = () => {
        router.push(`/`);
    };
    return(
        <div className="font-gummy text-center text-xl m-6">
            <h1 className="text-6xl font-bold mb-2">How-To & Rules</h1>
            <div>
                <p> Goal: Guess the secret word before the hangman figure completed. <br/>
                    The hangman adds a component everytime the guessed letter is not in the word. <br/>
                    Use the ASL Sign Guide to make A-Z to guess. Press guess and prepare your hand sign before the countdown.  </p>
                <Image
                      src="/asl_az.jpeg"
                      width={450}
                      height={300}
                      alt="ASL Fingerspelling chart"
                      className=""/>
            </div>
            <div className="flex justify-between my-2">
            <button onClick={handelPrev}>
                <div className="flex">
                <ChevronLeft size={28}/>
                Back
                </div>
            </button>
            <button onClick={handelNext}>
            <div className="flex">
                Next
                <ChevronRight size={28}/>
                </div>
            </button>
            </div>
        </div>
    );
};