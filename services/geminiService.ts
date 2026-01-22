
import { GoogleGenAI, Type } from "@google/genai";
import { ProductCategory } from "../types";

export class GeminiService {
  // Use process.env.API_KEY directly as per guidelines
  private static getAI() {
    return new GoogleGenAI({ apiKey: process.env.API_KEY });
  }

  /**
   * Generates 3 distinct creative scenarios for the campaign.
   */
  static async generateScenarios(assetBase64: string, brief: string, category: ProductCategory): Promise<string[]> {
    const ai = this.getAI();
    const cleanedBase64 = assetBase64.replace(/^data:image\/\w+;base64,/, '');

    const instructions: Record<ProductCategory, string> = {
      [ProductCategory.JEWELRY]: `Creative Director at a luxury house. Generate 3 scenarios: 1. High-contrast studio. 2. Heritage palace interior. 3. Minimalist architectural concrete. Diversity in lighting is key.`,
      [ProductCategory.RESTAURANT]: `Michelin-star food stylist. Generate 3 scenarios: 1. Warm candlelit bistro. 2. Modern marble fine-dining. 3. Rustic organic courtyard.`,
      [ProductCategory.FASHION]: `Vogue-tier fashion editor. Generate 3 scenarios: 1. Neon Tokyo street. 2. High-end minimal runway. 3. Desert dunes at sunset.`
    };

    try {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: {
          parts: [
            { inlineData: { data: cleanedBase64, mimeType: 'image/png' } },
            { text: `Category: ${category}. Brief: ${brief}. Output 3 diverse, cinematic scenarios.` }
          ]
        },
        config: {
          systemInstruction: instructions[category],
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
      return ["Minimalist High-Fashion Set", "Luxury Heritage Interior", "Cinematic Urban Context"];
    }
  }

  /**
   * Generates an environment-only background plate.
   */
  static async generateBackground(scenario: string, category: ProductCategory): Promise<string | undefined> {
    const ai = this.getAI();
    const prompt = `4K professional background-only photograph for a ${category} brand. Scenario: ${scenario}. ABSOLUTELY NO PEOPLE, MODELS, OR PRODUCTS. Empty space for product placement. Sharp, wide-angle.`;
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-pro-image-preview',
        contents: prompt,
        config: { imageConfig: { aspectRatio: "3:4", imageSize: "4K" } }
      });
      if (response.candidates?.[0]?.content?.parts) {
        for (const part of response.candidates[0].content.parts) {
          if (part.inlineData) return `data:image/png;base64,${part.inlineData.data}`;
        }
      }
    } catch { return undefined; }
  }

  /**
   * Generates the primary integration image.
   */
  static async generateModelImages(base64: string, scenarios: string[], category: ProductCategory): Promise<{ url: string, scenario: string, base64: string, backgroundUrl?: string }[]> {
    const results = [];
    const cleanedBase64 = base64.replace(/^data:image\/\w+;base64,/, '');

    for (const scenario of scenarios) {
      const prompt = `REFERENCE: Provided image. SCENARIO: ${scenario}.
      ANTI-CROP RULES: Use a wide-angle composition. Ensure the entire subject and all limbs/edges of the product are FULLY within the frame. No cut-offs.
      FOCUS: The product must be crystalline sharp (4K macro). 
      LIGHTING: Professional ray-traced shadows and highlights.`;

      let base64Data = '';
      let bgUrl: string | undefined = undefined;

      try {
        const bgPromise = this.generateBackground(scenario, category);
        // Create new AI instance right before making an API call
        const ai = this.getAI();
        const response = await ai.models.generateContent({
          model: 'gemini-3-pro-image-preview',
          contents: { parts: [{ inlineData: { data: cleanedBase64, mimeType: 'image/png' } }, { text: prompt }] },
          config: { imageConfig: { aspectRatio: "3:4", imageSize: "4K" } }
        });
        if (response?.candidates?.[0]?.content?.parts) {
          for (const part of response.candidates[0].content.parts) {
            if (part.inlineData) base64Data = part.inlineData.data;
          }
        }
        bgUrl = await bgPromise;
      } catch {
        // Fallback for speed/stability - creating new instance for fallback as well
        const fallbackAi = this.getAI();
        const fallback = await fallbackAi.models.generateContent({
          model: 'gemini-2.5-flash-image',
          contents: { parts: [{ inlineData: { data: cleanedBase64, mimeType: 'image/png' } }, { text: prompt + " (Strictly wide-angle)" }] },
          config: { imageConfig: { aspectRatio: "3:4" } }
        });
        if (fallback?.candidates?.[0]?.content?.parts) {
          for (const part of fallback.candidates[0].content.parts) {
            if (part.inlineData) base64Data = part.inlineData.data;
          }
        }
      }

      if (base64Data) {
        results.push({ url: `data:image/png;base64,${base64Data}`, scenario, base64: base64Data, backgroundUrl: bgUrl });
      }
    }
    return results;
  }

  static async editImage(originalBase64: string, editPrompt: string): Promise<string> {
    const ai = this.getAI();
    const cleanedBase64 = originalBase64.replace(/^data:image\/\w+;base64,/, '');
    const prompt = `Refine image: ${editPrompt}. RECONSTRUCT FOCAL SHARPNESS. Ensure all facets and textures are 4K crystalline. Do not crop the subject.`;
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: { parts: [{ inlineData: { data: cleanedBase64, mimeType: 'image/png' } }, { text: prompt }] }
    });
    if (response.candidates?.[0]?.content?.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
    throw new Error("Refinement failed.");
  }
}
