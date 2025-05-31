import Image from "next/image";

export default function Home() {
  return (
    <div className="text-center">
      <h1 className="text-3xl m-6">ASL Hangman</h1>
      <div>
        <div>
        <p className="text-2xl"> _ _ _ _ _ _ </p> { /* Dashes based on word count */  }
        { /* Hangman Figure */  }
        </div>
        <div>
        { /* Webcam Feed w/ prediction */  }
        </div>
      </div>
    </div>
  );
}
