import React, { useState, useEffect, useRef, useCallback } from 'react';
import { AppleCell, Point, SelectionBox, GameStatus } from '../types';
import { Apple } from './Apple';
import { ROWS, COLS, TARGET_SUM, getWeightedRandom } from '../constants';
import { RefreshCw } from 'lucide-react';

interface GameBoardProps {
  status: GameStatus;
  setStatus: (status: GameStatus) => void;
  score: number;
  setScore: React.Dispatch<React.SetStateAction<number>>;
  onGameOver: () => void;
}

export const GameBoard: React.FC<GameBoardProps> = ({ 
  status, 
  setStatus, 
  score, 
  setScore,
  onGameOver
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

  // Render
  return (
    <div className="flex flex-col items-center justify-center w-full max-w-4xl mx-auto p-2 md:p-4">
      
      {/* Top Bar */}
      <div className="flex w-full justify-between items-center mb-4 bg-white p-3 rounded-xl shadow-sm border-2 border-amber-100">
        <div className="flex items-center gap-4">
          <div className="flex flex-col">
             <span className="text-xs text-gray-500 font-semibold uppercase tracking-wider">Score</span>
             <span className="text-2xl font-bold text-amber-600">{score}</span>
          </div>
          <div className={`flex flex-col transition-opacity ${selection ? 'opacity-100' : 'opacity-0'}`}>
             <span className="text-xs text-gray-500 font-semibold uppercase tracking-wider">Current Sum</span>
             <span className={`text-2xl font-bold ${isValidSum ? 'text-green-600' : 'text-red-500'}`}>
               {currentSum}
             </span>
          </div>
        </div>

        <div className="flex gap-2">
           <button 
             onClick={initBoard}
             className="p-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors"
             title="Reset Board"
           >
             <RefreshCw className="w-5 h-5" />
           </button>
        </div>
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
         
         {/* Selection Overlay (Optional visual polish for box) */}
         {selection && (
            <div className="absolute pointer-events-none inset-0 z-0">
               {/* We could render a box here, but cell highlighting is usually enough and faster */}
            </div>
         )}
      </div>

      {/* Tutorial / Info */}
      <div className="mt-6 text-center text-amber-800 bg-amber-50/50 p-4 rounded-lg">
        <p className="font-semibold">Drag across numbers to sum exactly 10.</p>
        <p className="text-sm opacity-75">Clear all apples to win!</p>
      </div>

    </div>
  );
};