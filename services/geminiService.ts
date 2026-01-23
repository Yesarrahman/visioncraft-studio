
import { GoogleGenAI, Type } from "@google/genai";
import { ProductCategory } from "../types";

export class GeminiService {
  private static getAI() {
    return new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
  }

  /**
   * Analyzes the product and generates 3 cinematic scenario descriptions.
   */
  static async generateScenarios(assetBase64: string, brief: string, category: ProductCategory): Promise<string[]> {
    const ai = this.getAI();
    const cleanedBase64 = assetBase64.replace(/^data:image\/\w+;base64,/, '');

    const systemInstructions: Record<ProductCategory, string> = {
      [ProductCategory.JEWELRY]: "You are a Creative Director for a high-end luxury jewelry house. Propose 3 distinct, cinematic visual environments for this jewelry asset. Focus on lighting, texture, and editorial composition. Scenarios should be diverse (e.g., Minimalist, Heritage, Avant-Garde).",
      [ProductCategory.RESTAURANT]: "You are a Michelin-star hospitality designer. Propose 3 distinct dining atmospheres for this product.",
      [ProductCategory.FASHION]: "You are a lead editor at a global fashion magazine. Propose 3 editorial scenarios: 1. Urban Brutalism. 2. Desert High-Fashion. 3. Retro-Futurist Studio."
    };

    try {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: {
          parts: [
            { inlineData: { data: cleanedBase64, mimeType: 'image/png' } },
            { text: `Product: ${category}. Brief: ${brief}. Create 3 detailed environmental scenarios for a high-end render.` }
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
      return parsed.scenarios.length > 0 ? parsed.scenarios : ["High-End Studio Minimalist", "Luxury Boutique Interior", "Cinematic Sunset Terrace"];
    } catch (err) {
      console.error("Scenario synthesis failed:", err);
      return ["Architectural Minimalist Studio", "Heritage Luxury Interior", "Contemporary Editorial Context"];
    }
  }

  /**
   * Generates high-fidelity renders using the 2.5-flash-image model.
   * This model is optimized for fast, native image synthesis in production.
   */
  static async generateModelImages(base64: string, scenarios: string[], category: ProductCategory): Promise<{ url: string, scenario: string, base64: string }[]> {
    const ai = this.getAI();
    const cleanedBase64 = base64.replace(/^data:image\/\w+;base64,/, '');
    
    const renderPromises = scenarios.map(async (scenario) => {
      const prompt = `
        High-end professional product photography. 
        Category: ${category}. 
        Environment: ${scenario}. 
        The product in the provided image must be perfectly integrated into the scene with realistic shadows, reflections, and lighting. 
        Cinematic 4K quality, sharp focus, editorial color grading.
      `;

      try {
        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash-image',
          contents: { 
            parts: [
              { inlineData: { data: cleanedBase64, mimeType: 'image/png' } }, 
              { text: prompt }
            ] 
          },
          config: { 
            imageConfig: { 
              aspectRatio: "3:4"
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
        console.error(`Render failure for "${scenario}":`, err);
        return null;
      }
    });

    const results = await Promise.all(renderPromises);
    return results.filter((r): r is { url: string, scenario: string, base64: string } => r !== null);
  }

  /**
   * Edits an existing render for fine-tuning.
   */
  static async editImage(originalBase64: string, editPrompt: string): Promise<string> {
    const ai = this.getAI();
    const cleanedBase64 = originalBase64.replace(/^data:image\/\w+;base64,/, '');
    const prompt = `Refine this image: ${editPrompt}. Maintain 4K clarity. Focus on texture details, light intensity, and premium atmospheric depth.`;
    
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: { 
        parts: [
          { inlineData: { data: cleanedBase64, mimeType: 'image/png' } }, 
          { text: prompt }
        ] 
      },
      config: { 
        imageConfig: { 
          aspectRatio: "3:4"
        } 
      }
    });

    if (response.candidates?.[0]?.content?.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
    throw new Error("Refinement synthesis cycle failed.");
  }
}
