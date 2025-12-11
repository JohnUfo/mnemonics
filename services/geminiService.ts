import { GoogleGenAI, Type, Schema } from "@google/genai";
import { FlashCardData } from "../types";

const apiKey = process.env.API_KEY || '';
const ai = new GoogleGenAI({ apiKey });

// Schema for the flashcard response
const flashCardSchema: Schema = {
  type: Type.ARRAY,
  items: {
    type: Type.OBJECT,
    properties: {
      front: {
        type: Type.STRING,
        description: "The question, word, or front side of the card.",
      },
      back: {
        type: Type.STRING,
        description: "The answer, translation, or back side of the card.",
      },
      hint: {
        type: Type.STRING,
        description: "A subtle hint to help the user guess.",
      },
    },
    required: ["front", "back"],
  },
};

export const generateContentForCategory = async (topic: string): Promise<FlashCardData[]> => {
  try {
    const modelId = 'gemini-2.5-flash';
    
    let prompt = `Generate 5 challenging memory practice items for the topic: "${topic}". 
    The content should be in Uzbek (front) and English (back) if it's language related, 
    or Question (front) and Answer (back) if logic related.`;

    if (topic === 'Numbers') {
      prompt = "Generate 5 sequences of random numbers (5-8 digits long) as the 'front' and repeat them as the 'back'. The user has to memorize them. Hint should be 'Wait and recall'.";
    } else if (topic === 'Pictures') {
       prompt = "Generate 5 text descriptions of complex scenes for the 'front' (e.g. 'A blue cat sitting on a red fence'). The 'back' should be the key objects to remember (e.g. 'Blue Cat, Red Fence').";
    } else if (topic === 'Faces and Names') {
      prompt = "Generate 5 pairs of fictional names (front) and a short physical description (back) that needs to be associated with that name.";
    }

    const response = await ai.models.generateContent({
      model: modelId,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: flashCardSchema,
        systemInstruction: "You are a helpful brain training assistant designed to generate flashcards for memory improvement.",
      },
    });

    const text = response.text;
    if (!text) return [];

    return JSON.parse(text) as FlashCardData[];
  } catch (error) {
    console.error("Error generating content:", error);
    // Fallback data in case of error (or missing API key)
    return [
      { front: "Error generating content", back: "Please check your API Key", hint: "Configuration" },
    ];
  }
};
