
import { GoogleGenAI, Type } from "@google/genai";
import { ProductCategory } from "../types";

export class GeminiService {
  /**
   * Generates creative scenarios for product placement using Flash model for speed and logic.
   */
  static async generateScenarios(assetBase64: string, brief: string, category: ProductCategory): Promise<string[]> {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const cleanedBase64 = assetBase64.replace(/^data:image\/\w+;base64,/, '');

    const systemInstructions: Record<ProductCategory, string> = {
      [ProductCategory.JEWELRY]: "You are a Creative Director for a high-end luxury jewelry house. Propose 3 distinct, cinematic visual environments for this jewelry asset. Focus on lighting, texture, and editorial composition. Output strictly JSON.",
      [ProductCategory.RESTAURANT]: "You are a Michelin-star hospitality designer. Propose 3 distinct dining atmospheres for this product: 1. Midnight Intimacy. 2. Bright Organic. 3. Industrial Avant-Garde.",
      [ProductCategory.FASHION]: "You are a lead editor at a global fashion magazine. Propose 3 editorial scenarios: 1. Urban Brutalism. 2. Desert High-Fashion. 3. Retro-Futurist Studio."
    };

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: {
        parts: [
          { inlineData: { data: cleanedBase64, mimeType: 'image/png' } },
          { text: `Asset Type: ${category}. Brief: ${brief}. Propose 3 detailed scenarios for a 4K render.` }
        ]
      },
      config: {
        systemInstruction: systemInstructions[category],
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            scenarios: { type: Type.ARRAY, items: { type: Type.STRING } }
          },
          required: ["scenarios"]
        }
      }
    });

    const parsed = JSON.parse(response.text || '{"scenarios": []}');
    return parsed.scenarios.length > 0 ? parsed.scenarios : ["Minimalist Architectural Studio", "Luxury Boutique Interior", "Cinematic Sunset Balcony"];
  }

  /**
   * Renders the product into the chosen scenarios using the high-fidelity Pro Image model.
   */
  static async generateModelImages(base64: string, scenarios: string[], category: ProductCategory): Promise<{ url: string, scenario: string, base64: string }[]> {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const cleanedBase64 = base64.replace(/^data:image\/\w+;base64,/, '');
    
    // Process all renders in parallel for production-level speed
    const renderPromises = scenarios.map(async (scenario) => {
      const prompt = `
        TASK: High-Fidelity 4K Neural Integration.
        PRODUCT: ${category}.
        ENVIRONMENT: ${scenario}.
        
        TECHNICAL SPECS:
        - 4K resolution, macro sharpness.
        - Perfect ray-traced shadows and reflections.
        - Product must be the focal center, uncropped and whole.
        - Cinematic editorial lighting grade.
      `;

      try {
        const response = await ai.models.generateContent({
          model: 'gemini-3-pro-image-preview',
          contents: { 
            parts: [
              { inlineData: { data: cleanedBase64, mimeType: 'image/png' } }, 
              { text: prompt }
            ] 
          },
          config: { 
            imageConfig: { 
              aspectRatio: "3:4", 
              imageSize: "4K" 
            } 
          }
        });

        let base64Result = '';
        if (response?.candidates?.[0]?.content?.parts) {
          for (const part of response.candidates[0].content.parts) {
            if (part.inlineData) {
              base64Result = part.inlineData.data;
              break;
            }
          }
        }

        if (base64Result) {
          return { url: `data:image/png;base64,${base64Result}`, scenario, base64: base64Result };
        }
        return null;
      } catch (err) {
        console.error(`Render failed for scenario "${scenario}":`, err);
        return null;
      }
    });

    const results = await Promise.all(renderPromises);
    return results.filter((r): r is { url: string, scenario: string, base64: string } => r !== null);
  }

  /**
   * Refines an existing render based on user feedback.
   */
  static async editImage(originalBase64: string, editPrompt: string): Promise<string> {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const cleanedBase64 = originalBase64.replace(/^data:image\/\w+;base64,/, '');
    const prompt = `REFINEMENT: ${editPrompt}. Maintain 4K clarity. Focus on improving lighting, material textures, and atmospheric depth for a high-end luxury look.`;
    
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-image-preview',
      contents: { 
        parts: [
          { inlineData: { data: cleanedBase64, mimeType: 'image/png' } }, 
          { text: prompt }
        ] 
      },
      config: { 
        imageConfig: { 
          aspectRatio: "3:4", 
          imageSize: "4K" 
        } 
      }
    });

    if (response.candidates?.[0]?.content?.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
    throw new Error("Neural refinement cycle failed.");
  }
}
