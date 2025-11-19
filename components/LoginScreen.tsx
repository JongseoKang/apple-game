import React, { useState } from 'react';
import { Heart, Lock, ArrowRight } from 'lucide-react';
import { CREDENTIALS } from '../constants';

interface LoginScreenProps {
  onLogin: (username: string, password: string) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin }) => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (CREDENTIALS[password]) {
      onLogin(CREDENTIALS[password], password);
      setError(false);
    } else {
      setError(true);
      // Shake effect reset
      setTimeout(() => setError(false), 500);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-red-50 p-4">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl overflow-hidden border-2 border-red-100">
        {/* Header Image / Area */}
        <div className="bg-red-500 p-8 flex flex-col items-center justify-center text-white">
          <div className="bg-white/20 p-4 rounded-full mb-4 backdrop-blur-sm">
            <Heart className="w-10 h-10 fill-current text-white animate-pulse" />
          </div>
          <h1 className="text-2xl font-bold">커플 사과 게임</h1>
          <p className="text-red-100 text-sm mt-1">우리만의 비밀번호를 입력해줘</p>
        </div>

        {/* Form */}
        <div className="p-8">
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="password"
                placeholder="비밀번호 (1004 or 0000)"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={`
                  w-full pl-10 pr-4 py-3 rounded-xl border-2 outline-none transition-all
                  placeholder:text-gray-300 text-gray-700
                  ${error 
                    ? 'border-red-500 bg-red-50 animate-[shake_0.5s_ease-in-out]' 
                    : 'border-gray-100 focus:border-red-300 focus:bg-red-50/30'
                  }
                `}
                inputMode="numeric"
                pattern="[0-9]*"
              />
            </div>

            <button
              type="submit"
              className="w-full bg-gray-900 text-white py-3 rounded-xl font-bold shadow-lg hover:bg-gray-800 active:scale-95 transition-all flex items-center justify-center gap-2"
            >
              입장하기 <ArrowRight className="w-4 h-4" />
            </button>

            {error && (
              <p className="text-center text-red-500 text-sm font-medium animate-pulse">
                비밀번호가 틀렸어! 다시 확인해줘 🥺
              </p>
            )}
          </form>
        </div>
        
        <div className="bg-gray-50 p-4 text-center text-xs text-gray-400">
          Golden Apple: Couple Edition
        </div>
      </div>
      
      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-5px); }
          75% { transform: translateX(5px); }
        }
      `}</style>
    </div>
  );
};