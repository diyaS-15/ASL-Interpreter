'use client'
import { useRouter, useSearchParams} from 'next/navigation';
import {ChevronRight, ChevronLeft} from 'lucide-react';
import Image from 'next/image'

export default function Rules() {
    const router = useRouter(); 
    const searchParams = useSearchParams(); 
    const mode = searchParams.get('mode');
    const category = searchParams.get('category');
    const username = searchParams.get('username');
    
    const handelNext = () => {
        if(mode === 'learn'){
            router.push(`/Learn?mode=${mode}&category=${category}&username=${username}`);
        }
        else{
            router.push(`/Game?mode=${mode}&category=${category}&username=${username}`);
        }
    };
    const handelPrev = () => {
        router.push(`/`);
    };
    return(
        <div className="font-gummy text-center text-xl m-6">
            <h1 className="text-5xl font-bold mb-2 md:m-10">How-To & Rules</h1>
            <div className="md:grid md:grid-cols-2 md:gap-6">
                <p className="md:ml-6 text-left md:text-center md:m-4 md:leading-loose">
                    1. There is a random secret word associated with the category. Try to guess it before attempts run out to win! <br/>
                    2. Use the ASL Alphabet Sign guide to guess the letter.  <br/>
                    3. Select learn mode to be guided through the alphabets and select play mode to practice. <br/>
                    </p>
                <Image
                      src="/aslaz/mainaz.jpg"
                      width={200}
                      height={100}
                      alt="ASL Fingerspelling chart"
                      className="mx-auto my-2 md:hidden"/>
                <Image
                      src="/aslaz/mainaz.jpg"
                      width={270}
                      height={200}
                      alt="ASL Fingerspelling chart"
                      className="mx-auto hidden md:block"/>
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