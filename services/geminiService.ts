import { GoogleGenAI, Type, Schema } from "@google/genai";
import { ROWS, COLS, TARGET_SUM } from "../constants";
import { AppleCell, HintResponse } from "../types";

// Initialize Gemini Client
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const hintSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    found: {
      type: Type.BOOLEAN,
      description: "Whether a valid rectangle summing to 10 was found.",
    },
    startRow: {
      type: Type.INTEGER,
      description: "The starting row index (0-based) of the rectangle.",
    },
    startCol: {
      type: Type.INTEGER,
      description: "The starting column index (0-based) of the rectangle.",
    },
    endRow: {
      type: Type.INTEGER,
      description: "The ending row index (0-based) of the rectangle.",
    },
    endCol: {
      type: Type.INTEGER,
      description: "The ending column index (0-based) of the rectangle.",
    },
    message: {
      type: Type.STRING,
      description: "A short encouraging message or description of the location.",
    },
  },
  required: ["found"],
};

export const getSmartHint = async (grid: AppleCell[][]): Promise<HintResponse> => {
  try {
    // Convert grid to a simplified 2D string representation for the model
    // 0 represents a cleared cell (which shouldn't be used)
    const gridRepresentation = grid.map(row => 
      row.map(cell => cell.isCleared ? 0 : cell.value).join(',')
    ).join('\n');

    const prompt = `
      You are playing the "Apple Game" (Sum 10).
      Here is a ${ROWS}x${COLS} grid of numbers. 0 represents an empty space.
      Find a rectangular region of non-zero numbers where the sum of all numbers inside the rectangle is EXACTLY ${TARGET_SUM}.
      
      The rectangle coordinates are 0-indexed.
      Top-Left is [0,0].
      
      Grid Data:
      ${gridRepresentation}
      
      Return the coordinates of one such valid rectangle.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: hintSchema,
        temperature: 0.2, // Low temperature for logic/math
      }
    });

    if (response.text) {
      return JSON.parse(response.text) as HintResponse;
    }
    
    return { found: false, message: "AI couldn't analyze the board." };

  } catch (error) {
    console.error("Gemini Hint Error:", error);
    return { found: false, message: "AI is taking a nap." };
  }
};