
import { GoogleGenAI, Type } from "@google/genai";
import { ProductCategory } from "../types";

export class GeminiService {
  private static getAI() {
    const apiKey = process.env.API_KEY || '';
    return new GoogleGenAI({ apiKey });
  }

  /**
   * Generates 3 diverse, high-fidelity creative scenarios based on the product and category.
   */
  static async generateScenarios(assetBase64: string, brief: string, category: ProductCategory): Promise<string[]> {
    const ai = this.getAI();
    const cleanedBase64 = assetBase64.replace(/^data:image\/\w+;base64,/, '');

    const instructions: Record<ProductCategory, string> = {
      [ProductCategory.JEWELRY]: `You are a high-end creative director for a luxury jewelry brand. Create 3 distinct, cinematic scenarios. 
      Scenario 1: High-fashion editorial (e.g., Vogue-style studio with dramatic lighting). 
      Scenario 2: Royal heritage (e.g., palace balcony, evening glow). 
      Scenario 3: Modern minimalist (e.g., architectural concrete, soft natural light). 
      Ensure descriptions are vivid and contrast with each other.`,
      
      [ProductCategory.RESTAURANT]: `You are a Michelin-star food stylist and interior photographer. Create 3 distinct scenarios. 
      Scenario 1: Warm ambient bistro (e.g., candlelight, wooden textures). 
      Scenario 2: Modern fine dining (e.g., white marble, minimalist plating, bright airy lighting). 
      Scenario 3: Cultural heritage (e.g., traditional courtyard, rich cultural artifacts).`,
      
      [ProductCategory.FASHION]: `You are a visionary fashion editor for an elite magazine. Create 3 distinct scenarios. 
      Scenario 1: Street-style Tokyo/Paris (e.g., neon reflections, urban motion). 
      Scenario 2: High-end runway (e.g., dramatic stage lights, minimalist background). 
      Scenario 3: Nature-infused editorial (e.g., desert dunes, golden hour, flowing fabrics).`
    };

    try {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [
          {
            parts: [
              { inlineData: { data: cleanedBase64, mimeType: 'image/png' } },
              { text: `Category: ${category}. User Preference: ${brief}. Generate 3 DIVERSE, cinematic scenarios that are visually distinct in lighting, color, and mood.` }
            ]
          }
        ],
        config: {
          systemInstruction: instructions[category],
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              scenarios: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: "Array of 3 distinct creative scenarios."
              }
            },
            required: ["scenarios"]
          }
        }
      });

      const parsed = JSON.parse(response.text || '{"scenarios": []}');
      return parsed.scenarios.length >= 3 ? parsed.scenarios.slice(0, 3) : parsed.scenarios;
    } catch (err) {
      console.error("Scenario Generation Error:", err);
      return ["High-Contrast Minimalist Studio", "Exotic Luxury Locale", "Modern Urban Architectural Set"];
    }
  }

  /**
   * Generates images based on scenarios, ensuring full composition and no cut-offs.
   */
  static async generateModelImages(base64: string, scenarios: string[], category: ProductCategory): Promise<{ url: string, scenario: string, base64: string }[]> {
    const ai = this.getAI();
    const results = [];
    const cleanedBase64 = base64.replace(/^data:image\/\w+;base64,/, '');

    for (const scenario of scenarios) {
      const categoryPrompts: Record<ProductCategory, string> = {
        [ProductCategory.JEWELRY]: `MASTER MACRO PHOTOGRAPHY. Sub-millimeter precision. Every stone facet must be ray-traced and sharp. Zero blur on the jewelry. Sparkling highlights and fire refraction.`,
        [ProductCategory.RESTAURANT]: `ULTRA-HD FOOD STYLING. Glistening textures, realistic condensation, vibrant saturation. Tableware and background must feel luxurious and complete.`,
        [ProductCategory.FASHION]: `EDITORIAL FASHION MASTERPIECE. Micro-fabric textures. Professional model with high-frequency skin detail. The garment must flow naturally and be the focal point.`
      };

      const prompt = `REFERENCE ASSET: The provided image. 
      TASK: Integrate this EXACT asset into a 4K professional photograph.
      SCENARIO: ${scenario}.
      
      CRITICAL COMPOSITION RULES:
      1. FULL FRAME VISIBILITY: The entire subject and its context must be fully contained within the frame. DO NOT crop the product or the model's head/limbs unless specified. Ensure a balanced, centered, or artistically wide composition.
      2. ASSET INTEGRITY: Keep the asset's geometry and color 100% identical to the reference but rendered in the scene's lighting.
      3. ZERO BLUR ON ASSET: The product asset MUST be the sharpest part of the image. Use deep focus for the product and soft bokeh for the distant background.
      
      ${categoryPrompts[category]}
      QUALITY: 4K Ultra-HD, Cinematic, Professional Grade, No Artifacts, Complete Scene.`;

      let base64Data = '';
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
            imageConfig: { aspectRatio: "3:4", imageSize: "4K" }
          }
        });

        if (response?.candidates?.[0]?.content?.parts) {
          for (const part of response.candidates[0].content.parts) {
            if (part.inlineData) {
              base64Data = part.inlineData.data;
              break;
            }
          }
        }
      } catch (err) {
        console.warn("High-fidelity model failed, attempting fallback...");
        const fallback = await ai.models.generateContent({
          model: 'gemini-2.5-flash-image',
          contents: {
            parts: [
              { inlineData: { data: cleanedBase64, mimeType: 'image/png' } },
              { text: prompt + " (Ensure full body and product visibility, no cropping)" }
            ]
          },
          config: { imageConfig: { aspectRatio: "3:4" } }
        });
        if (fallback?.candidates?.[0]?.content?.parts) {
          for (const part of fallback.candidates[0].content.parts) {
            if (part.inlineData) base64Data = part.inlineData.data;
          }
        }
      }

      if (base64Data) {
        results.push({
          url: `data:image/png;base64,${base64Data}`,
          scenario,
          base64: base64Data
        });
      }
    }

    return results;
  }

  /**
   * Refines the image with granular control over detail, sparkle, and sharpness.
   */
  static async editImage(originalBase64: string, editPrompt: string): Promise<string> {
    const ai = this.getAI();
    const cleanedBase64 = originalBase64.replace(/^data:image\/\w+;base64,/, '');
    
    // Injecting granular refinement logic into the prompt
    const refinementInstructions = `
    Analyze the current image and apply the following modifications: ${editPrompt}.
    
    GRANULAR REFINEMENT STANDARDS:
    - IF SHARPNESS IS REQUESTED: Increase edge definition and local contrast. Reconstruct blurred textures with high-frequency detail.
    - IF TEXTURE IS REQUESTED: Elevate the micro-detail of metal, fabric, or food surfaces. Ensure every pore or thread is visible.
    - IF SPARKLE/GEMS REQUESTED: Add spectral highlights, ray-traced light dispersion, and brilliant internal reflections to stones or glossy surfaces.
    
    MAINTAIN: Scene lighting consistency and asset geometry. Ensure the entire composition remains fully visible and professional.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          { inlineData: { data: cleanedBase64, mimeType: 'image/png' } },
          { text: refinementInstructions }
        ]
      }
    });

    let base64Data = '';
    if (response?.candidates?.[0]?.content?.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
          base64Data = part.inlineData.data;
          break;
        }
      }
    }
    return `data:image/png;base64,${base64Data}`;
  }
}
