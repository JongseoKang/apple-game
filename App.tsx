import React, { useState, useEffect, useRef } from 'react';
import { GameStatus, GameMessage } from './types';
import { GameBoard } from './components/GameBoard';
import { LoginScreen } from './components/LoginScreen';
import { GAME_DURATION_SECONDS, OPPONENT_MAPPING, PEER_ID_PREFIX } from './constants';
import { Timer, Trophy, Play, LogOut, User, Heart, Users, Wifi, WifiOff } from 'lucide-react';

const App: React.FC = () => {
  // Auth State
  const [user, setUser] = useState<string | null>(null);
  const [myPassword, setMyPassword] = useState<string | null>(null);

  // Game State
  const [status, setStatus] = useState<GameStatus>(GameStatus.IDLE);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION_SECONDS);

  // Multiplayer State
  const [isConnected, setIsConnected] = useState(false);
  const [opponentScore, setOpponentScore] = useState(0);
  const peerRef = useRef<any>(null);
  const connRef = useRef<any>(null);

  // Cleanup peer on unmount
  useEffect(() => {
    return () => {
      if (peerRef.current) peerRef.current.destroy();
    };
  }, []);

  // Initialize Peer when logged in
  useEffect(() => {
    if (!user || !myPassword) return;

    const initPeer = async () => {
      if (peerRef.current) return;

      const myPeerId = `${PEER_ID_PREFIX}${myPassword}`;
      
      // Create Peer
      const peer = new window.Peer(myPeerId, {
        debug: 2
      });

      peer.on('open', (id: string) => {
        console.log('My peer ID is: ' + id);
        connectToOpponent(peer);
      });

      peer.on('connection', (conn: any) => {
        console.log('Incoming connection from', conn.peer);
        setupConnection(conn);
      });

      peer.on('error', (err: any) => {
        console.error('Peer error:', err);
        // If ID is taken, it might mean we refreshed. 
        // In a real app we handle this better, but for now we just try to connect.
      });

      peerRef.current = peer;
    };

    const connectToOpponent = (peer: any) => {
      if (!myPassword) return;
      const opponentPassword = OPPONENT_MAPPING[myPassword];
      if (!opponentPassword) return;

      const targetPeerId = `${PEER_ID_PREFIX}${opponentPassword}`;
      console.log('Trying to connect to:', targetPeerId);

      const conn = peer.connect(targetPeerId);
      setupConnection(conn);
    };

    const setupConnection = (conn: any) => {
      conn.on('open', () => {
        console.log('Connected to opponent!');
        setIsConnected(true);
        connRef.current = conn;
      });

      conn.on('data', (data: GameMessage) => {
        handleMessage(data);
      });

      conn.on('close', () => {
        console.log('Connection closed');
        setIsConnected(false);
        connRef.current = null;
      });
      
      // Replace existing connection reference with the new active one if needed
      // Simple logic: just use the latest valid one
      connRef.current = conn;
    };

    initPeer();
  }, [user, myPassword]);

  const handleMessage = (msg: GameMessage) => {
    switch (msg.type) {
      case 'START':
        startGame(false); // Start as follower (don't send msg back)
        break;
      case 'SCORE':
        setOpponentScore(msg.payload);
        break;
      case 'GAME_OVER':
        // Maybe show opponent finished?
        break;
      case 'RESTART':
         setStatus(GameStatus.LOBBY);
         setScore(0);
         setOpponentScore(0);
         break;
    }
  };

  const sendMessage = (msg: GameMessage) => {
    if (connRef.current && isConnected) {
      connRef.current.send(msg);
    }
  };

  // Timer Logic
  useEffect(() => {
    let interval: number | undefined;

    if (status === GameStatus.PLAYING) {
      interval = window.setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            setStatus(GameStatus.GAME_OVER);
            sendMessage({ type: 'GAME_OVER' });
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => clearInterval(interval);
  }, [status]);

  // Send score updates
  useEffect(() => {
    if (status === GameStatus.PLAYING) {
      sendMessage({ type: 'SCORE', payload: score });
    }
  }, [score, status]);

  const handleLogin = (username: string, password: string) => {
    setUser(username);
    setMyPassword(password);
    setStatus(GameStatus.LOBBY);
  };

  const handleLogout = () => {
    if (peerRef.current) {
      peerRef.current.destroy();
      peerRef.current = null;
    }
    setUser(null);
    setMyPassword(null);
    setStatus(GameStatus.IDLE);
    setIsConnected(false);
    setScore(0);
    setOpponentScore(0);
  };

  const handleStartClick = () => {
    startGame(true);
  };

  const startGame = (isInitiator: boolean) => {
    setScore(0);
    setOpponentScore(0);
    setTimeLeft(GAME_DURATION_SECONDS);
    setStatus(GameStatus.PLAYING);
    if (isInitiator) {
      sendMessage({ type: 'START' });
    }
  };

  const handleRestart = () => {
    setStatus(GameStatus.LOBBY);
    setScore(0);
    setOpponentScore(0);
    sendMessage({ type: 'RESTART' });
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // If not logged in, show Login Screen
  if (!user) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  return (
    <div className="min-h-screen w-full flex flex-col items-center bg-stone-50 text-gray-800">
      
      {/* Header */}
      <header className="w-full bg-red-500 text-white shadow-lg p-3 md:p-4 z-20">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
             <div className="bg-white/20 p-2 rounded-full backdrop-blur-sm">
               <User className="w-5 h-5 text-white" />
             </div>
             <div className="flex flex-col leading-tight">
               <span className="text-xs text-red-100 opacity-80">Player</span>
               <span className="font-bold text-lg">{user}</span>
             </div>
          </div>
          
          <div className="flex items-center gap-4">
            {status === GameStatus.PLAYING && (
              <div className="flex items-center gap-2 bg-red-700/50 px-3 py-1 rounded-lg border border-red-400/30">
                <Timer className="w-5 h-5 text-red-100" />
                <span className="font-mono text-xl font-bold">{formatTime(timeLeft)}</span>
              </div>
            )}
            
            {status !== GameStatus.PLAYING && (
              <button 
                onClick={handleLogout}
                className="p-2 hover:bg-white/10 rounded-full transition-colors"
                title="Logout"
              >
                <LogOut className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 w-full flex flex-col items-center justify-center p-4">
        
        {/* LOBBY SCREEN */}
        {(status === GameStatus.IDLE || status === GameStatus.LOBBY) && (
           <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md text-center border-b-4 border-amber-200 w-full">
             <div className="relative w-24 h-24 mx-auto mb-6 flex items-center justify-center">
               <div className="absolute inset-0 bg-red-100 rounded-full animate-pulse opacity-50"></div>
               <div className="relative z-10 text-6xl">🍎</div>
               {isConnected && (
                  <div className="absolute -bottom-2 -right-2 bg-green-500 text-white p-2 rounded-full border-2 border-white shadow-sm">
                    <Heart className="w-4 h-4 fill-current" />
                  </div>
               )}
             </div>

             <h2 className="text-2xl font-bold text-gray-800 mb-2">
               {isConnected ? '커플 연결 완료! 💑' : '상대방 기다리는 중...'}
             </h2>
             
             <div className="flex items-center justify-center gap-2 mb-8 text-sm">
               {isConnected ? (
                 <span className="flex items-center gap-1 text-green-600 font-semibold bg-green-50 px-3 py-1 rounded-full">
                   <Wifi className="w-4 h-4" /> Online
                 </span>
               ) : (
                 <span className="flex items-center gap-1 text-amber-600 font-semibold bg-amber-50 px-3 py-1 rounded-full">
                   <WifiOff className="w-4 h-4" /> Offline
                 </span>
               )}
             </div>

             <p className="text-gray-500 mb-8 leading-relaxed">
               {isConnected 
                 ? '이제 준비가 다 됐어!\n시작 버튼을 누르면 동시에 게임이 시작돼.' 
                 : '여자친구(혹은 남자친구)가 들어오면\n자동으로 연결될 거야.'}
             </p>
             
             <button 
               onClick={handleStartClick}
               disabled={!isConnected}
               className={`
                 w-full py-4 rounded-xl font-bold text-xl shadow-lg transform transition-all flex items-center justify-center gap-2
                 ${isConnected 
                   ? 'bg-green-500 hover:bg-green-600 text-white active:scale-95' 
                   : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                 }
               `}
             >
               <Play className={isConnected ? 'fill-current' : ''} /> 
               {isConnected ? '대결 시작하기' : '연결 대기중...'}
             </button>
           </div>
        )}

        {/* GAME OVER SCREEN */}
        {status === GameStatus.GAME_OVER && (
           <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md text-center border-b-4 border-red-200 animate-in fade-in zoom-in duration-300 w-full">
             <div className="mx-auto mb-4 text-amber-500">
               <Trophy className="w-16 h-16 mx-auto drop-shadow-sm" />
             </div>
             <h2 className="text-3xl font-bold text-gray-800 mb-2">시간 종료!</h2>
             
             <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="py-4 bg-red-50 rounded-xl border border-red-100">
                  <p className="text-gray-500 text-xs uppercase tracking-wider font-semibold mb-1">My Score</p>
                  <div className="text-4xl font-black text-red-500">{score}</div>
                </div>
                <div className="py-4 bg-blue-50 rounded-xl border border-blue-100">
                  <p className="text-gray-500 text-xs uppercase tracking-wider font-semibold mb-1">Opponent</p>
                  <div className="text-4xl font-black text-blue-500">{opponentScore}</div>
                </div>
             </div>
             
             <div className="flex gap-3">
               <button 
                  onClick={handleLogout}
                  className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-xl font-bold text-lg transition-colors"
               >
                 나가기
               </button>
               <button 
                 onClick={handleRestart}
                 className="flex-[2] py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-bold text-lg shadow-md transform transition active:scale-95"
               >
                 로비로
               </button>
             </div>
           </div>
        )}

        {status === GameStatus.PLAYING && (
          <GameBoard 
            status={status}
            setStatus={setStatus}
            score={score}
            setScore={setScore}
            onGameOver={() => setStatus(GameStatus.GAME_OVER)}
            opponentScore={opponentScore}
          />
        )}

      </main>

      <footer className="w-full p-4 text-center text-gray-400 text-xs">
         With Love ❤️
      </footer>
    </div>
  );
};

export default App;