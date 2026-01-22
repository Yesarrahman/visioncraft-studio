
import { GoogleGenAI, Type } from "@google/genai";
import { ProductCategory } from "../types";

export class GeminiService {
  private static getAI() {
    const key = process.env.API_KEY;
    if (!key || key === 'undefined' || key.length < 5) {
      throw new Error("API_KEY_MISSING");
    }
    return new GoogleGenAI({ apiKey: key });
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
   * Generates an environment-only background plate with context-aware lighting and atmosphere.
   */
  static async generateBackground(scenario: string, category: ProductCategory): Promise<string | undefined> {
    const ai = this.getAI();
    
    let styleCues = "";
    const lowerScenario = scenario.toLowerCase();
    
    if (lowerScenario.includes("studio") || lowerScenario.includes("minimalist")) {
      styleCues = "Clean, diffused studio lighting, soft shadows, high-key or low-key atmosphere, focus on smooth surfaces like silk, satin, or polished concrete.";
    } else if (lowerScenario.includes("heritage") || lowerScenario.includes("palace") || lowerScenario.includes("royal")) {
      styleCues = "Warm ambient lighting, intricate architectural details, wood or marble textures, opulent atmosphere, deep shadows, and golden hour highlights.";
    } else if (lowerScenario.includes("outdoor") || lowerScenario.includes("nature") || lowerScenario.includes("desert") || lowerScenario.includes("street")) {
      styleCues = "Natural directional lighting, cinematic weather cues, environmental textures like sand, asphalt, or foliage, organic bokeh in the background.";
    }

    const categoryCues: Record<ProductCategory, string> = {
      [ProductCategory.JEWELRY]: "Elegant macro textures, surfaces optimized for jewelry placement (velvet, marble, or polished stone), high specular highlight potential.",
      [ProductCategory.RESTAURANT]: "Tabletop focus, hospitality-grade textures (linen, wood, slate), inviting depth of field, optimized for plate or glassware placement.",
      [ProductCategory.FASHION]: "Wide architectural lines, urban or runway textures, optimized for full-body or garment placement, editorial framing."
    };

    const prompt = `
      TASK: Generate a 4K professional environment-only photograph for a ${category} campaign.
      SCENARIO: ${scenario}.
      STYLE CUES: ${styleCues}
      CATEGORY SPECIFICS: ${categoryCues[category]}
      
      CRITICAL CONSTRAINTS:
      1. ABSOLUTELY NO PEOPLE, NO MODELS, NO PRODUCTS.
      2. THE IMAGE MUST BE AN EMPTY BACKGROUND PLATE.
      3. PROVIDE AMPLE EMPTY SPACE (NEGATE SPACE) specifically for product placement.
      4. COMPOSITION: Professional photography, sharp 4K resolution, cinematic wide-angle lens (24mm style).
      
      QUALITY: Ultra-HD, Ray-traced lighting, photorealistic textures.
    `;

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
    } catch (err) {
      console.warn("Enhanced background generation failed, attempting simple fallback.", err);
      try {
        const fallbackAi = this.getAI();
        const fallback = await fallbackAi.models.generateContent({
          model: 'gemini-2.5-flash-image',
          contents: `Empty background plate for ${category}, ${scenario} style. No products, no people.`
        });
        if (fallback.candidates?.[0]?.content?.parts) {
          for (const part of fallback.candidates[0].content.parts) {
            if (part.inlineData) return `data:image/png;base64,${part.inlineData.data}`;
          }
        }
      } catch (fallbackErr) {
        return undefined;
      }
    }
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
      } catch (err: any) {
        if (err.message === "API_KEY_MISSING") throw err;
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
