
import { GoogleGenAI, Type } from "@google/genai";
import { ProductCategory } from "../types";

export class GeminiService {
  private static getAI() {
    const key = process.env.API_KEY;
    if (!key) {
      console.warn("VisionCraft: API_KEY not found in environment. Please ensure it is set in Netlify.");
    }
    return new GoogleGenAI({ apiKey: key || '' });
  }

  static async generateScenarios(assetBase64: string, brief: string, category: ProductCategory): Promise<string[]> {
    const ai = this.getAI();
    const cleanedBase64 = assetBase64.replace(/^data:image\/\w+;base64,/, '');

    const systemInstructions: Record<ProductCategory, string> = {
      [ProductCategory.JEWELRY]: "You are a Creative Director for a high-end luxury jewelry house. Your task is to propose 3 distinct, cinematic visual environments for a piece of jewelry. Scenarios must be diverse: 1. Architectural Minimalist. 2. Heritage Luxury. 3. Contemporary Editorial. Focus on lighting and texture. Be descriptive but concise.",
      [ProductCategory.RESTAURANT]: "You are a Michelin-star hospitality designer. Propose 3 distinct dining atmospheres for this product: 1. Midnight Intimacy. 2. Bright Organic. 3. Industrial Avant-Garde.",
      [ProductCategory.FASHION]: "You are a lead editor at a global fashion magazine. Propose 3 editorial scenarios: 1. Urban Brutalism. 2. Desert High-Fashion. 3. Retro-Futurist Studio."
    };

    try {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: {
          parts: [
            { inlineData: { data: cleanedBase64, mimeType: 'image/png' } },
            { text: `Analyze this ${category} product. Brief: ${brief}. Output 3 highly descriptive scenarios.` }
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
      return parsed.scenarios.length > 0 ? parsed.scenarios : ["Minimalist Architectural Studio", "Luxury Heritage Interior", "Cinematic Sunset Terrace"];
    } catch (err) {
      console.error("Scenario Generation Error:", err);
      return ["Architectural Minimalist Studio", "High-End Luxury Boutique", "Contemporary Editorial Background"];
    }
  }

  static async generateModelImages(base64: string, scenarios: string[], category: ProductCategory): Promise<{ url: string, scenario: string, base64: string }[]> {
    const cleanedBase64 = base64.replace(/^data:image\/\w+;base64,/, '');
    
    // We execute these in parallel for faster studio performance
    const renderPromises = scenarios.map(async (scenario) => {
      const prompt = `
        TASK: High-Fidelity 4K Neural Rendering and Product Integration.
        PRODUCT CATEGORY: ${category}.
        ENVIRONMENTAL DIRECTION: ${scenario}.
        
        VISUAL GUIDELINES:
        - 4K resolution, macro-level sharpness.
        - Cinematic lighting with realistic shadows and specular highlights.
        - The product must be the focal point, perfectly integrated into the lighting of the scene.
        - Ensure the product remains whole and uncropped.
        - Use professional product photography composition.
      `;

      try {
        const ai = this.getAI();
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
          return { 
            url: `data:image/png;base64,${base64Result}`, 
            scenario, 
            base64: base64Result 
          };
        }
        return null;
      } catch (err) {
        console.error(`Rendering failed for scenario: "${scenario}"`, err);
        return null;
      }
    });

    const results = await Promise.all(renderPromises);
    return results.filter((r): r is { url: string, scenario: string, base64: string } => r !== null);
  }

  static async editImage(originalBase64: string, editPrompt: string): Promise<string> {
    const ai = this.getAI();
    const cleanedBase64 = originalBase64.replace(/^data:image\/\w+;base64,/, '');
    const prompt = `PERFORM HIGH-END STUDIO REFINE: ${editPrompt}. Maintain 4K clarity. Focus on improving texture, lighting quality, and premium atmospheric depth.`;
    
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
    throw new Error("Neural refinement synthesis failed.");
  }
}
