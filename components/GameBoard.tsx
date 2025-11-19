import React, { useState, useEffect, useRef, useCallback } from 'react';
import { AppleCell, Point, SelectionBox, GameStatus } from '../types';
import { Apple } from './Apple';
import { ROWS, COLS, TARGET_SUM, getWeightedRandom } from '../constants';
import { RefreshCw, Heart } from 'lucide-react';

interface GameBoardProps {
  status: GameStatus;
  setStatus: (status: GameStatus) => void;
  score: number;
  setScore: React.Dispatch<React.SetStateAction<number>>;
  onGameOver: () => void;
  opponentScore: number;
  isConnected: boolean;
}

export const GameBoard: React.FC<GameBoardProps> = ({ 
  status, 
  setStatus, 
  score, 
  setScore,
  onGameOver,
  opponentScore,
  isConnected
}) => {
  const [grid, setGrid] = useState<AppleCell[][]>([]);
  const [selection, setSelection] = useState<SelectionBox | null>(null);
  const [dragStart, setDragStart] = useState<Point | null>(null);
  const boardRef = useRef<HTMLDivElement>(null);

  // Initialize Board
  const initBoard = useCallback(() => {
    const newGrid: AppleCell[][] = [];
    for (let r = 0; r < ROWS; r++) {
      const row: AppleCell[] = [];
      for (let c = 0; c < COLS; c++) {
        row.push({
          id: `${r}-${c}-${Math.random()}`,
          value: getWeightedRandom(),
          r,
          c,
          isCleared: false
        });
      }
      newGrid.push(row);
    }
    setGrid(newGrid);
    setScore(0);
  }, [setScore]);

  // Initial setup
  useEffect(() => {
    if (status === GameStatus.PLAYING && grid.length === 0) {
      initBoard();
    }
  }, [status, grid.length, initBoard]);

  // Selection Logic helpers
  const getSelectedRange = (start: Point, end: Point) => {
    const minR = Math.min(start.r, end.r);
    const maxR = Math.max(start.r, end.r);
    const minC = Math.min(start.c, end.c);
    const maxC = Math.max(start.c, end.c);
    return { minR, maxR, minC, maxC };
  };

  const isCellSelected = (r: number, c: number) => {
    if (!selection) return false;
    const { minR, maxR, minC, maxC } = getSelectedRange(selection.start, selection.end);
    return r >= minR && r <= maxR && c >= minC && c <= maxC;
  };

  const calculateSum = (start: Point, end: Point) => {
    const { minR, maxR, minC, maxC } = getSelectedRange(start, end);
    let sum = 0;
    let count = 0;
    
    for (let r = minR; r <= maxR; r++) {
      for (let c = minC; c <= maxC; c++) {
        if (!grid[r][c].isCleared) {
          sum += grid[r][c].value;
          count++;
        }
      }
    }
    return { sum, count };
  };

  // Mouse Handlers
  const handleMouseDown = (r: number, c: number) => {
    if (status !== GameStatus.PLAYING) return;
    setDragStart({ r, c });
    setSelection({ start: { r, c }, end: { r, c } });
  };

  const handleMouseEnter = (r: number, c: number) => {
    if (status !== GameStatus.PLAYING || !dragStart) return;
    setSelection({ start: dragStart, end: { r, c } });
  };

  const handleMouseUp = () => {
    if (status !== GameStatus.PLAYING || !selection) {
      setDragStart(null);
      setSelection(null);
      return;
    }

    const { sum, count } = calculateSum(selection.start, selection.end);

    if (sum === TARGET_SUM && count > 0) {
      // Success! Clear cells
      const { minR, maxR, minC, maxC } = getSelectedRange(selection.start, selection.end);
      
      setGrid(prev => prev.map((row, rIdx) => {
        if (rIdx < minR || rIdx > maxR) return row;
        return row.map((cell, cIdx) => {
          if (cIdx >= minC && cIdx <= maxC && !cell.isCleared) {
            return { ...cell, isCleared: true };
          }
          return cell;
        });
      }));

      setScore(s => s + count);
    }

    setDragStart(null);
    setSelection(null);
  };

  // Touch support helper (mapping touch coordinates to grid cells)
  const handleTouchMove = (e: React.TouchEvent) => {
    if (!dragStart || status !== GameStatus.PLAYING) return;
    
    const touch = e.touches[0];
    // Optimization: In a real robust app, calculate grid coordinates relative to boardRef.
    if (boardRef.current) {
       const rect = boardRef.current.getBoundingClientRect();
       const x = touch.clientX - rect.left;
       const y = touch.clientY - rect.top;
       
       // Approximate cell size
       const cellWidth = rect.width / COLS;
       const cellHeight = rect.height / ROWS;
       
       const c = Math.floor(x / cellWidth);
       const r = Math.floor(y / cellHeight);
       
       if (r >= 0 && r < ROWS && c >= 0 && c < COLS) {
         setSelection({ start: dragStart, end: { r, c } });
       }
    }
  };

  // Current Selection Sum for UI
  const currentSum = selection ? calculateSum(selection.start, selection.end).sum : 0;
  const isValidSum = currentSum === TARGET_SUM;

  return (
    <div className="flex flex-col items-center justify-center w-full max-w-4xl mx-auto p-2 md:p-4">
      
      {/* Top Bar */}
      <div className="flex w-full justify-between items-center mb-4 gap-2">
        
        {/* My Score */}
        <div className="flex-1 bg-white p-3 rounded-xl shadow-sm border-l-4 border-red-400 flex flex-col items-start">
           <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">My Score</span>
           <span className="text-2xl font-bold text-gray-800">{score}</span>
        </div>

        {/* Current Sum Indicator (Center) */}
        <div className={`flex-1 flex flex-col items-center transition-opacity duration-200 ${selection ? 'opacity-100' : 'opacity-0'}`}>
             <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-1">Sum</span>
             <div className={`
               w-12 h-12 rounded-full flex items-center justify-center text-xl font-bold shadow-inner
               ${isValidSum ? 'bg-green-100 text-green-600 border-2 border-green-200' : 'bg-gray-100 text-gray-500 border-2 border-gray-200'}
             `}>
               {currentSum}
             </div>
        </div>

        {/* Opponent Score (Only visible if connected) */}
        {isConnected ? (
          <div className="flex-1 bg-white p-3 rounded-xl shadow-sm border-r-4 border-blue-400 flex flex-col items-end">
             <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest flex items-center gap-1">
               Opponent <Heart className="w-3 h-3 fill-red-200 text-red-200" />
             </span>
             <span className="text-2xl font-bold text-blue-500">{opponentScore}</span>
          </div>
        ) : (
          // Spacer to keep layout symmetric
          <div className="flex-1 bg-transparent p-3 flex flex-col items-end opacity-50">
             <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Practice</span>
             <span className="text-xs font-bold text-gray-400">Single Mode</span>
          </div>
        )}

      </div>

      {/* Game Grid Container */}
      <div 
        className="relative bg-amber-50 p-2 rounded-xl border-4 border-amber-200 shadow-inner overflow-hidden select-none touch-none"
        onMouseLeave={() => {
            if (selection) {
                setDragStart(null);
                setSelection(null);
            }
        }}
      >
         {/* Grid */}
         <div 
           ref={boardRef}
           className="grid gap-1"
           style={{ 
             gridTemplateColumns: `repeat(${COLS}, minmax(0, 1fr))`,
             // Fixed aspect ratio management logic roughly
             width: 'min(90vw, 800px)',
             aspectRatio: `${COLS}/${ROWS}`
           }}
           onTouchMove={handleTouchMove}
           onTouchEnd={handleMouseUp}
         >
           {grid.map((row) => (
             row.map((cell) => (
               <Apple 
                 key={cell.id}
                 cell={cell}
                 isSelected={isCellSelected(cell.r, cell.c)}
                 onMouseDown={handleMouseDown}
                 onMouseEnter={handleMouseEnter}
                 onMouseUp={handleMouseUp}
               />
             ))
           ))}
         </div>
      </div>
      
      <div className="flex w-full justify-center mt-4">
         <button 
             onClick={initBoard}
             className="flex items-center gap-2 px-4 py-2 bg-white text-gray-500 rounded-full text-sm font-medium shadow-sm hover:bg-gray-50 transition-colors"
           >
             <RefreshCw className="w-4 h-4" /> 보드 새로고침
         </button>
      </div>

    </div>
  );
};