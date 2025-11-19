export const ROWS = 10;
export const COLS = 16;
export const TARGET_SUM = 10;
export const GAME_DURATION_SECONDS = 120;

// Login Credentials (Password: Username)
// You can change these to whatever you want!
export const CREDENTIALS: Record<string, string> = {
  "1004": "공주님 👸",  // Girlfriend's Password
  "0000": "왕자님 🤴"   // Boyfriend's Password
};

// Mapping to find who is the opponent based on MY password
// If I login with "1004", my opponent is "0000"
export const OPPONENT_MAPPING: Record<string, string> = {
  "1004": "0000",
  "0000": "1004"
};

// Peer ID Prefix to avoid random collisions on the public server
export const PEER_ID_PREFIX = "golden-apple-couple-v1-";

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

// One-click Taunt Messages
export const TAUNT_MESSAGES = [
  "빨리 좀 해 🥱",
  "내가 봐준다ㅋ 😏",
  "실력 이거밖에 안돼? 🤭",
  "손가락 쥐났어? 🐭",
  "사랑의 힘으로 이긴다 ❤️",
  "거기가 아니야! 😝",
  "너무 느려 🐢",
  "포기해라~ 😈"
];