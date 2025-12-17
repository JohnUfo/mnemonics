
import { GoogleGenAI, Type } from "@google/genai";
import { FlashCardData } from "../types";

// Always use process.env.API_KEY directly for initialization as per guidelines
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// Schema for the flashcard response using Type enum instead of deprecated SchemaType
const flashCardSchema = {
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

export interface GenerationOptions {
  cursorWidth?: number;
  separatorLines?: number;
}

const generateImageCard = async (description: string): Promise<FlashCardData> => {
  try {
    // Using gemini-2.5-flash-image for image generation as per guidelines
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: { parts: [{ text: description }] },
      config: {
        imageConfig: { aspectRatio: "1:1" }
      },
    });

    let imageUrl = '';
    
    // Iterate through parts to find the image part (do not assume it's the first part)
    if (response.candidates?.[0]?.content?.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
          imageUrl = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
          break;
        }
      }
    }

    return {
      front: "Visual Memory", // Placeholder text, UI will show image
      back: description,
      imageUrl: imageUrl,
      hint: "Visualize the details"
    };
  } catch (e) {
    console.error("Image generation failed", e);
    return { front: "Error loading image", back: description };
  }
};

export const generateContentForCategory = async (topic: string, options?: GenerationOptions): Promise<FlashCardData[]> => {
  try {
    // Special handling for Pictures to generate actual images
    if (topic === 'Pictures') {
      const imagePrompts = [
        "A cute robotic cat playing chess in a futuristic park",
        "A floating island with a giant ancient tree and waterfalls",
        "A steampunk turtle carrying a small city on its shell"
      ];
      
      // Generate images in parallel
      const imageCards = await Promise.all(imagePrompts.map(prompt => generateImageCard(prompt)));
      return imageCards;
    }

    // Recommended model for basic text tasks
    const modelId = 'gemini-3-flash-preview';
    
    let prompt = `Generate 5 challenging memory practice items for the topic: "${topic}". 
    The content should be in Uzbek (front) and English (back) if it's language related, 
    or Question (front) and Answer (back) if logic related.`;

    if (topic === 'Numbers') {
      const width = options?.cursorWidth || 5;
      const count = options?.separatorLines || 1;
      // Construct a prompt that asks for 'count' groups of 'width' digits
      prompt = `Generate 5 items. Each item front should be a sequence of random numbers formatted as ${count} groups of ${width} digits (e.g. if width 2 count 2: "12 34"). The back should be the same numbers. Hint: 'Memorize the sequence'.`;
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

    // response.text is a property, not a method
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
