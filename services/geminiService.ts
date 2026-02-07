
import { GoogleGenAI, Type } from "@google/genai";
import { AIAnalysis } from '../types';

export const analyzeFractalLocation = async (
  x: number, 
  y: number, 
  zoom: number
): Promise<AIAnalysis> => {
  // Always use a direct reference to process.env.API_KEY
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const prompt = `You are a mathematical poet and fractal explorer. I am currently looking at the Mandelbrot set at these coordinates: 
  Real (X): ${x}
  Imaginary (Y): ${y}
  Zoom Level: ${zoom}x
  
  Describe the visual landscape of this location in a poetic yet scientifically grounded way. 
  What might it look like? (e.g. galaxies, tendrils, geometric gardens). 
  Provide a suggestion on what to look for next (e.g. "Zoom into the dark crevices for mini-sets").
  
  Return the response as a valid JSON object with the following keys:
  "title": A short catchy title for this location.
  "description": A 2-3 sentence poetic description.
  "suggestion": A helpful exploration tip.`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        // Using responseSchema for robust JSON extraction
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: {
              type: Type.STRING,
              description: 'A catchy name for the location.',
            },
            description: {
              type: Type.STRING,
              description: 'Poetic landscape description.',
            },
            suggestion: {
              type: Type.STRING,
              description: 'Exploration advice.',
            },
          },
          required: ["title", "description", "suggestion"],
        },
      }
    });

    // Directly access the text property as per the guidelines
    const result = JSON.parse(response.text?.trim() || '{}');
    return {
      title: result.title || "The Infinite Edge",
      description: result.description || "You stand at the boundary between chaos and order, where complex numbers dance in recursive loops.",
      suggestion: result.suggestion || "Try zooming deeper into the filaments for higher complexity.",
      coordinates: `(${x.toFixed(6)}, ${y.toFixed(6)})`
    };
  } catch (error) {
    console.error("AI Analysis failed:", error);
    return {
      title: "Mathematical Infinity",
      description: "An intricate boundary where iteration reveals the beautiful complexity of the Mandelbrot set.",
      suggestion: "Keep exploring the edges of the set to find more patterns.",
      coordinates: `(${x.toFixed(6)}, ${y.toFixed(6)})`
    };
  }
};
