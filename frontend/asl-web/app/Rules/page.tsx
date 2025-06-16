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
        if(mode === 'learn'){
            router.push(`/Learn?mode=${mode}&category=${category}`);
        }
        else{
            router.push(`/Game?mode=${mode}&category=${category}`);
        }
    };
    const handelPrev = () => {
        router.push(`/`);
    };
    return(
        <div className="font-gummy text-center text-xl m-6">
            <h1 className="text-6xl font-bold mb-2 md:m-10">How-To & Rules</h1>
            <div className="md:grid md:grid-cols-2 md:gap-6">
                <p className="md:ml-6"> Goal: Guess the secret word before the hangman figure completed. <br/>
                    The hangman adds a component everytime the guessed letter is not in the word. <br/>
                    Use the ASL Sign Guide to make A-Z to guess. Press guess and prepare your hand sign before the countdown.  </p>
                <Image
                      src="/asl_az.jpeg"
                      width={450}
                      height={300}
                      alt="ASL Fingerspelling chart"
                      className="md:ml-5 lg:ml-30"/>
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