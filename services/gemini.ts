
import { GoogleGenAI, Type } from "@google/genai";
import { GameMode, Difficulty, Question } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export async function fetchQuestions(
  mode: GameMode, 
  subject: string, 
  difficulty: Difficulty, 
  count: number = 10
): Promise<Question[]> {
  let prompt = `Generate ${count} trivia questions for a ${mode} mode. 
  Subject: ${subject}. 
  Difficulty: ${difficulty}. 
  Ensure questions are factually accurate, academically sound, and engaging.
  Each question must have exactly 4 unique options.
  Include a detailed educational explanation for the correct answer.`;

  if (mode === GameMode.CATEGORY_KINGS) {
    prompt = `Generate exactly 18 trivia questions for CATEGORY KINGS mode. 
    Subject domain: ${subject}. 
    Difficulty: ${difficulty}.
    REQUIREMENT: Group the questions into 6 distinct sub-categories related to ${subject} (e.g., if subject is Sports, categories could be Football, Tennis, etc.).
    Provide exactly 3 questions per category.
    Format: Ensure the first 3 questions are from Category 1, the next 3 from Category 2, and so on.
    Each question must have exactly 4 unique options.
    Include a detailed educational explanation.`;
  }

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            id: { type: Type.STRING },
            subject: { type: Type.STRING, description: "The specific sub-category name" },
            difficulty: { type: Type.STRING },
            text: { type: Type.STRING },
            options: { 
              type: Type.ARRAY, 
              items: { type: Type.STRING },
              description: "Exactly 4 options"
            },
            correctAnswerIndex: { type: Type.INTEGER },
            explanation: { type: Type.STRING }
          },
          required: ["id", "subject", "difficulty", "text", "options", "correctAnswerIndex", "explanation"]
        }
      }
    }
  });

  try {
    return JSON.parse(response.text) as Question[];
  } catch (e) {
    console.error("Failed to parse questions", e);
    return [];
  }
}
