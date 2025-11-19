import React, { useState, useEffect, useRef } from 'react';
import { GameStatus, GameMessage, ChatMessagePayload, AppleCell } from './types';
import { GameBoard } from './components/GameBoard';
import { LoginScreen } from './components/LoginScreen';
import { ChatWidget } from './components/ChatWidget';
import { GAME_DURATION_SECONDS, OPPONENT_MAPPING, PEER_ID_PREFIX, CREDENTIALS, ROWS, COLS, getWeightedRandom } from './constants';
import { Timer, Trophy, Play, LogOut, User, Heart, Wifi, WifiOff, UserMinus, Loader2, Medal, Frown, Minus } from 'lucide-react';

interface GameStats {
  wins: number;
  losses: number;
  draws: number;
}

const App: React.FC = () => {
  // Auth State
  const [user, setUser] = useState<string | null>(null);
  const [myPassword, setMyPassword] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  // Game State
  const [status, setStatus] = useState<GameStatus>(GameStatus.IDLE);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION_SECONDS);
  const [canExit, setCanExit] = useState(false); // Button activation state
  
  // Board State (Lifted from GameBoard)
  const [grid, setGrid] = useState<AppleCell[][]>([]);

  // Multiplayer State
  const [isConnected, setIsConnected] = useState(false);
  const [opponentScore, setOpponentScore] = useState(0);
  const [chatMessages, setChatMessages] = useState<ChatMessagePayload[]>([]);
  
  // Stats State
  const [stats, setStats] = useState<GameStats>({ wins: 0, losses: 0, draws: 0 });
  
  const peerRef = useRef<any>(null);
  const connRef = useRef<any>(null);

  // Helper: Generate Grid
  const generateNewGrid = (): AppleCell[][] => {
    const newGrid: AppleCell[][] = [];
    for (let r = 0; r < ROWS; r++) {
      const row: AppleCell[] = [];
      for (let c = 0; c < COLS; c++) {
        row.push({
          id: `${r}-${c}-${Date.now()}-${Math.random()}`, // Unique ID
          value: getWeightedRandom(),
          r,
          c,
          isCleared: false
        });
      }
      newGrid.push(row);
    }
    return newGrid;
  };

  // Cleanup peer on unmount
  useEffect(() => {
    return () => {
      if (peerRef.current) peerRef.current.destroy();
    };
  }, []);

  // Load Stats on Login
  useEffect(() => {
    if (user) {
      const savedStats = localStorage.getItem(`apple-stats-${user}`);
      if (savedStats) {
        setStats(JSON.parse(savedStats));
      } else {
        setStats({ wins: 0, losses: 0, draws: 0 });
      }
    }
  }, [user]);

  // Handle Game Over: Delay & Stats Update
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;

    if (status === GameStatus.GAME_OVER) {
      setCanExit(false);
      timer = setTimeout(() => {
        setCanExit(true);
      }, 3000);

      // Update Stats only if connected (Multiplayer)
      if (isConnected && user) {
        setStats(prev => {
          const newStats = { ...prev };
          if (score > opponentScore) newStats.wins++;
          else if (score < opponentScore) newStats.losses++;
          else newStats.draws++;

          localStorage.setItem(`apple-stats-${user}`, JSON.stringify(newStats));
          return newStats;
        });
      }
    } else {
      setCanExit(false);
    }
    return () => clearTimeout(timer);
  }, [status]);

  // Real-time Login Logic
  const handleLoginAttempt = (password: string) => {
    if (peerRef.current) {
      peerRef.current.destroy();
      peerRef.current = null;
    }

    setIsLoggingIn(true);
    setLoginError(null);

    const myPeerId = `${PEER_ID_PREFIX}${password}`;
    
    // Create Peer instance with improved ICE servers for better NAT traversal
    const peer = new window.Peer(myPeerId, {
      debug: 1, // Reduced debug level
      config: {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' },
          { urls: 'stun:stun2.l.google.com:19302' },
          { urls: 'stun:stun3.l.google.com:19302' },
          { urls: 'stun:stun4.l.google.com:19302' },
        ]
      }
    });

    // SUCCESS: Peer ID created successfully
    peer.on('open', (id: string) => {
      console.log('Login successful. Peer ID:', id);
      
      // Remove login-specific error handler
      peer.off('error');
      
      // Add runtime error handler
      peer.on('error', handleRuntimePeerError);

      // Set state
      setUser(CREDENTIALS[password]);
      setMyPassword(password);
      setStatus(GameStatus.LOBBY);
      setIsLoggingIn(false);
      
      peerRef.current = peer;

      // Setup incoming connections
      peer.on('connection', (conn: any) => {
        console.log('Incoming connection from', conn.peer);
        setupConnection(conn);
      });

      // Start looking for opponent
      connectToOpponent(peer, password);
    });

    // FAILURE: Login error (mostly duplicate ID)
    peer.on('error', (err: any) => {
      console.error('Login Peer error:', err);
      setIsLoggingIn(false);
      
      if (err.type === 'unavailable-id') {
        setLoginError("이미 접속 중인 계정이야! (혹은 방금 나갔다면 10초만 기다려줘) 😢");
      } else if (err.type === 'browser-incompatible') {
        setLoginError("이 브라우저는 지원하지 않아.");
      } else if (err.type === 'disconnected') {
        setLoginError("인터넷 연결을 확인해줘.");
      } else {
        setLoginError(`접속 오류: ${err.type}`);
      }
      
      // Cleanup
      peer.destroy();
      peerRef.current = null;
    });
  };

  const handleRuntimePeerError = (err: any) => {
    // Ignore peer-unavailable errors during gameplay (it just means opponent isn't there yet)
    if (err.type === 'peer-unavailable') return;
    console.warn('Runtime Peer Error:', err);
  };

  const connectToOpponent = (peer: any, currentPassword: string) => {
    const opponentPassword = OPPONENT_MAPPING[currentPassword];
    if (!opponentPassword) return;

    const targetPeerId = `${PEER_ID_PREFIX}${opponentPassword}`;
    console.log('Looking for opponent:', targetPeerId);

    // Try to connect immediately
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
    
    // Keep the latest connection
    connRef.current = conn;
  };

  const handleMessage = (msg: GameMessage) => {
    switch (msg.type) {
      case 'START':
        // Receive initial grid from host for perfect sync
        if (msg.payload && msg.payload.grid) {
          setGrid(msg.payload.grid);
        }
        setScore(0);
        setOpponentScore(0);
        setTimeLeft(GAME_DURATION_SECONDS);
        setStatus(GameStatus.PLAYING);
        break;
      case 'SCORE':
        setOpponentScore(msg.payload);
        break;
      case 'APPLES_CLEARED':
        // Payload should be list of Apple IDs to clear
        handleRemoteClear(msg.payload);
        break;
      case 'GAME_OVER':
        // Handled by time usually, but can sync here
        break;
      case 'RESTART':
         setStatus(GameStatus.LOBBY);
         setScore(0);
         setOpponentScore(0);
         break;
      case 'CHAT':
        setChatMessages(prev => [...prev, msg.payload]);
        break;
    }
  };

  const sendMessage = (msg: GameMessage) => {
    if (connRef.current && connRef.current.open) {
      connRef.current.send(msg);
    }
  };

  // Sync Logic: Handle Remote Clears
  const handleRemoteClear = (clearedIds: string[]) => {
    setGrid(prevGrid => {
      return prevGrid.map(row => 
        row.map(cell => {
          if (clearedIds.includes(cell.id)) {
            return { ...cell, isCleared: true };
          }
          return cell;
        })
      );
    });
  };

  // GameBoard Callback: Handle Local Clears
  const handleLocalSolve = (cells: AppleCell[]) => {
    // 1. Update Local Grid
    const idsToClear = cells.map(c => c.id);
    
    setGrid(prevGrid => {
      return prevGrid.map(row => 
        row.map(cell => {
          if (idsToClear.includes(cell.id)) {
            return { ...cell, isCleared: true };
          }
          return cell;
        })
      );
    });

    // 2. Update Score
    setScore(prev => prev + cells.length);

    // 3. Send updates to opponent
    if (isConnected) {
      sendMessage({ type: 'APPLES_CLEARED', payload: idsToClear });
      // Note: We send score separately to keep it reliable, 
      // though we could technically calculate it from clears.
      // But sticking to explicit score messages is safer.
    }
  };

  const handleSendChat = (text: string, isTaunt: boolean = false) => {
    if (!user) return;
    
    const chatPayload: ChatMessagePayload = {
      id: Date.now().toString() + Math.random(),
      sender: user,
      text,
      isTaunt,
      timestamp: Date.now()
    };

    // Update local state immediately
    setChatMessages(prev => [...prev, chatPayload]);

    // Send to opponent
    sendMessage({ type: 'CHAT', payload: chatPayload });
  };

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

  // Send score updates
  useEffect(() => {
    if (status === GameStatus.PLAYING && isConnected) {
      sendMessage({ type: 'SCORE', payload: score });
    }
  }, [score, status, isConnected]);

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
    setChatMessages([]);
  };

  const handleStartClick = () => {
    // Initiator generates the grid
    const initialGrid = generateNewGrid();
    setGrid(initialGrid);
    
    setScore(0);
    setOpponentScore(0);
    setTimeLeft(GAME_DURATION_SECONDS);
    setStatus(GameStatus.PLAYING);
    
    // Send START with the generated grid
    sendMessage({ 
      type: 'START',
      payload: { grid: initialGrid }
    });
  };

  const handleSoloPlayClick = () => {
    // Single player start
    setGrid(generateNewGrid());
    setScore(0);
    setOpponentScore(0);
    setTimeLeft(GAME_DURATION_SECONDS);
    setStatus(GameStatus.PLAYING);
  };

  const handleRestart = () => {
    setStatus(GameStatus.LOBBY);
    setScore(0);
    setOpponentScore(0);
    if (isConnected) {
      sendMessage({ type: 'RESTART' });
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getResultTitle = () => {
    if (!isConnected) return "게임 종료";
    if (score > opponentScore) return "WIN! 🎉";
    if (score < opponentScore) return "LOSE... 😭";
    return "DRAW! 🤝";
  };

  // If not logged in, show Login Screen
  if (!user) {
    return (
      <LoginScreen 
        onLogin={handleLoginAttempt} 
        isLoading={isLoggingIn}
        serverError={loginError}
      />
    );
  }

  return (
    <div className="min-h-screen w-full flex flex-col items-center bg-stone-50 text-gray-800">
      
      {/* Header */}
      <header className="w-full bg-red-500 text-white shadow-lg p-3 md:p-4 z-20 sticky top-0">
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
      <main className="flex-1 w-full flex flex-col items-center p-4 pb-20 max-w-4xl mx-auto">
        
        {/* LOBBY SCREEN */}
        {(status === GameStatus.IDLE || status === GameStatus.LOBBY) && (
           <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md text-center border-b-4 border-amber-200 w-full mb-6">
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
             
             <div className="flex items-center justify-center gap-2 mb-6 text-sm">
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

             {/* Record Card */}
             <div className="mb-8 bg-gray-50 rounded-xl p-4 border border-gray-100">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">VS Record</p>
                <div className="flex justify-between items-center px-4">
                   <div className="flex flex-col items-center">
                      <span className="text-2xl font-black text-green-500">{stats.wins}</span>
                      <span className="text-[10px] font-bold text-gray-400">WIN</span>
                   </div>
                   <div className="w-px h-8 bg-gray-200"></div>
                   <div className="flex flex-col items-center">
                      <span className="text-2xl font-black text-gray-400">{stats.draws}</span>
                      <span className="text-[10px] font-bold text-gray-400">DRAW</span>
                   </div>
                   <div className="w-px h-8 bg-gray-200"></div>
                   <div className="flex flex-col items-center">
                      <span className="text-2xl font-black text-red-500">{stats.losses}</span>
                      <span className="text-[10px] font-bold text-gray-400">LOSE</span>
                   </div>
                </div>
             </div>

             <p className="text-gray-500 mb-8 leading-relaxed">
               {isConnected 
                 ? '이제 준비가 다 됐어!\n시작 버튼을 누르면 동시에 게임이 시작돼.' 
                 : '여자친구(혹은 남자친구)가 들어오면\n자동으로 연결될 거야.'}
             </p>
             
             <div className="flex flex-col gap-3">
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

               {!isConnected && (
                 <button 
                   onClick={handleSoloPlayClick}
                   className="w-full py-3 rounded-xl font-semibold text-gray-500 bg-white border-2 border-gray-200 hover:bg-gray-50 hover:border-gray-300 transition-all flex items-center justify-center gap-2"
                 >
                   <UserMinus className="w-4 h-4" /> 기다리기 힘들다면 혼자 연습하기
                 </button>
               )}
             </div>
           </div>
        )}

        {/* GAME OVER SCREEN */}
        {status === GameStatus.GAME_OVER && (
           <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md text-center border-b-4 border-red-200 animate-in fade-in zoom-in duration-300 w-full mb-6">
             <div className="mx-auto mb-4 text-amber-500">
               {isConnected && score > opponentScore && <Medal className="w-16 h-16 mx-auto text-yellow-400 drop-shadow-md" />}
               {isConnected && score < opponentScore && <Frown className="w-16 h-16 mx-auto text-gray-400" />}
               {isConnected && score === opponentScore && <Minus className="w-16 h-16 mx-auto text-gray-400" />}
               {!isConnected && <Trophy className="w-16 h-16 mx-auto drop-shadow-sm" />}
             </div>
             
             <h2 className="text-3xl font-black text-gray-800 mb-1">{getResultTitle()}</h2>
             <p className="text-gray-400 text-sm mb-6 font-medium">Game Finished</p>
             
             <div className={`grid gap-4 mb-8 ${isConnected ? 'grid-cols-2' : 'grid-cols-1'}`}>
                <div className={`py-4 rounded-xl border-2 ${isConnected && score > opponentScore ? 'bg-red-50 border-red-200 ring-2 ring-red-100' : 'bg-gray-50 border-gray-100'}`}>
                  <p className="text-gray-500 text-xs uppercase tracking-wider font-semibold mb-1">My Score</p>
                  <div className="text-4xl font-black text-red-500">{score}</div>
                </div>
                {isConnected && (
                  <div className={`py-4 rounded-xl border-2 ${score < opponentScore ? 'bg-blue-50 border-blue-200 ring-2 ring-blue-100' : 'bg-gray-50 border-gray-100'}`}>
                    <p className="text-gray-500 text-xs uppercase tracking-wider font-semibold mb-1">Opponent</p>
                    <div className="text-4xl font-black text-blue-500">{opponentScore}</div>
                  </div>
                )}
             </div>
             
             <div className="flex gap-3">
               <button 
                  onClick={handleLogout}
                  disabled={!canExit}
                  className={`
                    flex-1 py-3 rounded-xl font-bold text-lg transition-all
                    ${canExit 
                      ? 'bg-gray-100 hover:bg-gray-200 text-gray-600' 
                      : 'bg-gray-100/50 text-gray-300 cursor-not-allowed'
                    }
                  `}
               >
                 {!canExit ? '기다려...' : '나가기'}
               </button>
               <button 
                 onClick={handleRestart}
                 disabled={!canExit}
                 className={`
                   flex-[2] py-3 rounded-xl font-bold text-lg shadow-md transform transition-all flex items-center justify-center gap-2
                   ${canExit 
                     ? 'bg-amber-500 hover:bg-amber-600 text-white active:scale-95' 
                     : 'bg-amber-300 text-amber-100 cursor-not-allowed'
                   }
                 `}
               >
                 {!canExit ? <Loader2 className="w-5 h-5 animate-spin" /> : '로비로'}
               </button>
             </div>
           </div>
        )}

        {status === GameStatus.PLAYING && (
          <GameBoard 
            status={status}
            grid={grid}
            score={score}
            opponentScore={opponentScore}
            isConnected={isConnected}
            onSolve={handleLocalSolve}
            onRefreshBoard={() => setGrid(generateNewGrid())}
          />
        )}

        {/* CHAT WIDGET (Visible when connected) */}
        {isConnected && (
          <ChatWidget 
            currentUser={user}
            messages={chatMessages}
            onSendMessage={handleSendChat}
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