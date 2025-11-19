import React from 'react';
import { AppleCell } from '../types';

interface AppleProps {
  cell: AppleCell;
  isSelected: boolean;
  onMouseDown: (r: number, c: number) => void;
  onMouseEnter: (r: number, c: number) => void;
  onMouseUp: () => void;
}

export const Apple: React.FC<AppleProps> = ({ 
  cell, 
  isSelected, 
  onMouseDown, 
  onMouseEnter,
  onMouseUp
}) => {
  
  // Prevent interaction if cleared
  if (cell.isCleared) {
    return <div className="w-full h-full" />;
  }

  return (
    <div
      className="relative w-full h-full flex items-center justify-center select-none touch-none p-0.5"
      onMouseDown={(e) => {
        e.preventDefault(); // Prevent text selection
        onMouseDown(cell.r, cell.c);
      }}
      onMouseEnter={() => onMouseEnter(cell.r, cell.c)}
      onMouseUp={onMouseUp}
      // Touch events for mobile support
      onTouchStart={(e) => {
        // Prevent scrolling
        // Logic handled by parent mostly, but good to capture start
        onMouseDown(cell.r, cell.c);
      }}
    >
      <div 
        className={`
          w-full aspect-square rounded-full flex items-center justify-center
          shadow-md transition-all duration-150 ease-in-out transform
          border-2
          ${isSelected 
            ? 'bg-yellow-200 border-yellow-500 scale-110 z-10' 
            : 'bg-red-500 border-red-700 hover:scale-105'
          }
        `}
      >
        {/* Leaf */}
        {!isSelected && (
          <div className="absolute -top-1 left-1/2 w-2 h-2 bg-green-600 rounded-tr-lg rounded-bl-lg -translate-x-1/2" />
        )}

        <span 
          className={`
            text-xl font-bold
            ${isSelected ? 'text-gray-800' : 'text-white'}
          `}
        >
          {cell.value}
        </span>
      </div>
    </div>
  );
};