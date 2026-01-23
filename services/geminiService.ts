
import { ProductCategory } from "../types";

const FN_PATH = '/.netlify/functions/genai-proxy';

export class GeminiService {
  static async generateScenarios(assetBase64: string, brief: string, category: ProductCategory): Promise<string[]> {
    try {
      const res = await fetch(FN_PATH, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'generateScenarios', payload: { assetBase64, brief, category } })
      });
      const data = await res.json();
      return data.scenarios || [];
    } catch (err) {
      console.error('Scenario Error:', err);
      return ['Minimalist Architectural Studio', 'Luxury Heritage Interior', 'Cinematic Sunset Terrace'];
    }
  }

  static async generateModelImages(base64: string, scenarios: string[], category: ProductCategory): Promise<{ url: string, scenario: string, base64: string, backgroundUrl?: string }[]> {
    try {
      const res = await fetch(FN_PATH, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'generateModelImages', payload: { base64, scenarios, category } })
      });
      const data = await res.json();
      return data.results || [];
    } catch (err) {
      console.error('Rendering Error:', err);
      return [];
    }
  }

  static async editImage(originalBase64: string, editPrompt: string): Promise<string> {
    try {
      const res = await fetch(FN_PATH, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'editImage', payload: { originalBase64, editPrompt } })
      });
      const data = await res.json();
      return data.image;
    } catch (err) {
      console.error('Edit Error:', err);
      throw err;
    }
  }
}
