
import { GoogleGenAI, Type } from "@google/genai";
import { ProductCategory } from "../types";

export class GeminiService {
  private static getAI() {
    // Rely exclusively on process.env.API_KEY as per high-fidelity environment requirements
    const key = process.env.API_KEY;
    return new GoogleGenAI({ apiKey: key || '' });
  }

  static async generateScenarios(assetBase64: string, brief: string, category: ProductCategory): Promise<string[]> {
    const ai = this.getAI();
    const cleanedBase64 = assetBase64.replace(/^data:image\/\w+;base64,/, '');

    const systemInstructions: Record<ProductCategory, string> = {
      [ProductCategory.JEWELRY]: "You are a Creative Director for a high-end luxury jewelry house. Your task is to propose 3 distinct, cinematic visual environments for a piece of jewelry. Scenarios must be diverse: 1. Architectural Minimalist. 2. Heritage Luxury. 3. Contemporary Editorial. Focus on lighting and texture.",
      [ProductCategory.RESTAURANT]: "You are a Michelin-star hospitality designer. Propose 3 distinct dining atmospheres: 1. Midnight Intimacy. 2. Bright Organic. 3. Industrial Avant-Garde.",
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
      return parsed.scenarios;
    } catch (err) {
      console.error("Scenario Error:", err);
      return ["Minimalist Architectural Studio", "Luxury Heritage Interior", "Cinematic Sunset Terrace"];
    }
  }

  static async generateModelImages(base64: string, scenarios: string[], category: ProductCategory): Promise<{ url: string, scenario: string, base64: string, backgroundUrl?: string }[]> {
    const results = [];
    const cleanedBase64 = base64.replace(/^data:image\/\w+;base64,/, '');

    for (const scenario of scenarios) {
      const prompt = `
        TASK: High-Fidelity 4K Neural Integration.
        PRODUCT: ${category}.
        ENVIRONMENT: ${scenario}.
        
        TECHNICAL REQUIREMENTS:
        1. Ray-traced lighting and reflections.
        2. Crystalline sharp focus on the product (macro quality).
        3. Professional editorial composition with wide-angle framing.
        4. No cropping—ensure all product edges are within the frame.
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

        let base64Data = '';
        if (response?.candidates?.[0]?.content?.parts) {
          for (const part of response.candidates[0].content.parts) {
            if (part.inlineData) base64Data = part.inlineData.data;
          }
        }

        if (base64Data) {
          results.push({ 
            url: `data:image/png;base64,${base64Data}`, 
            scenario, 
            base64: base64Data 
          });
        }
      } catch (err) {
        console.error("Rendering Error for scenario:", scenario, err);
      }
    }
    return results;
  }

  static async editImage(originalBase64: string, editPrompt: string): Promise<string> {
    const ai = this.getAI();
    const cleanedBase64 = originalBase64.replace(/^data:image\/\w+;base64,/, '');
    const prompt = `REFINE RENDER: ${editPrompt}. Maintain 4K resolution and high-fidelity textures. Enhance specular highlights and color grade for a premium cinematic look.`;
    
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
    throw new Error("Neural refinement failed.");
  }
}
