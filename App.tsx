import React, { useState, useEffect } from 'react';
import { GameStatus } from './types';
import { GameBoard } from './components/GameBoard';
import { GAME_DURATION_SECONDS } from './constants';
import { Timer, Trophy, Play, AlertTriangle } from 'lucide-react';

const App: React.FC = () => {
  const [status, setStatus] = useState<GameStatus>(GameStatus.IDLE);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION_SECONDS);

  // Timer Logic
  useEffect(() => {
    let interval: number | undefined;

    if (status === GameStatus.PLAYING) {
      interval = window.setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            setStatus(GameStatus.GAME_OVER);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => clearInterval(interval);
  }, [status]);

  const startGame = () => {
    setScore(0);
    setTimeLeft(GAME_DURATION_SECONDS);
    setStatus(GameStatus.PLAYING);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen w-full flex flex-col items-center bg-stone-50 text-gray-800">
      
      {/* Header */}
      <header className="w-full bg-red-500 text-white shadow-lg p-4">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-2">
             <div className="bg-white p-1.5 rounded-full">
               <span className="text-2xl">🍎</span>
             </div>
             <h1 className="text-2xl font-bold tracking-tight">Golden Apple</h1>
          </div>
          
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2 bg-red-600 px-3 py-1 rounded-lg shadow-inner">
               <Timer className="w-5 h-5 text-red-100" />
               <span className="font-mono text-xl font-bold">{formatTime(timeLeft)}</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 w-full flex flex-col items-center justify-center p-4">
        
        {status === GameStatus.IDLE && (
           <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md text-center border-b-4 border-amber-200">
             <div className="w-24 h-24 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6 text-6xl">
               🍎
             </div>
             <h2 className="text-3xl font-bold text-gray-800 mb-2">Apple Game</h2>
             <p className="text-gray-500 mb-8">
               Drag to select numbers that sum to <strong>10</strong>.
               <br/>Clear as many as you can before time runs out!
             </p>
             <button 
               onClick={startGame}
               className="w-full py-4 bg-green-500 hover:bg-green-600 text-white rounded-xl font-bold text-xl shadow-lg transform transition active:scale-95 flex items-center justify-center gap-2"
             >
               <Play className="fill-current" /> Game Start
             </button>
           </div>
        )}

        {status === GameStatus.GAME_OVER && (
           <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md text-center border-b-4 border-red-200 animate-in fade-in zoom-in duration-300">
             <div className="mx-auto mb-4 text-amber-500">
               <Trophy className="w-16 h-16 mx-auto" />
             </div>
             <h2 className="text-3xl font-bold text-gray-800 mb-2">Time's Up!</h2>
             <div className="text-5xl font-bold text-red-500 mb-6">{score} <span className="text-xl text-gray-400">apples</span></div>
             
             <button 
               onClick={startGame}
               className="w-full py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-bold text-lg shadow-md transform transition active:scale-95"
             >
               Try Again
             </button>
           </div>
        )}

        {status === GameStatus.PLAYING && (
          <GameBoard 
            status={status}
            setStatus={setStatus}
            score={score}
            setScore={setScore}
            onGameOver={() => setStatus(GameStatus.GAME_OVER)}
          />
        )}

      </main>

      <footer className="w-full p-4 text-center text-gray-400 text-sm">
         Powered by Gemini AI • React • Tailwind
      </footer>
    </div>
  );
};

export default App;