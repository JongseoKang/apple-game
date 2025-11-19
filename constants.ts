export const ROWS = 10;
export const COLS = 16;
export const TARGET_SUM = 10;
export const GAME_DURATION_SECONDS = 120;

// Weighted random generation to ensure "10" is makable often (bias towards lower numbers)
export const NUMBER_WEIGHTS = [
  1, 1, 1, 1, // Ones
  2, 2, 2,    // Twos
  3, 3, 3,    // Threes
  4, 4,       // Fours
  5, 5,       // Fives
  6, 6,       // Sixes
  7,          // Sevens
  8,          // Eights
  9           // Nines
];

export const getWeightedRandom = (): number => {
  const idx = Math.floor(Math.random() * NUMBER_WEIGHTS.length);
  return NUMBER_WEIGHTS[idx];
};