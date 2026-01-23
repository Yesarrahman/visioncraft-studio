exports.handler = async function (event) {
    try {
        const { default: genai } = await import('@google/genai');
        const { GoogleGenAI, Type } = genai;
        const apiKey = process.env.API_KEY;
        if (!apiKey) {
            return { statusCode: 500, body: JSON.stringify({ error: 'Missing server API_KEY' }) };
        }

        const ai = new GoogleGenAI({ apiKey });
        const body = event.body ? JSON.parse(event.body) : {};
        const { action, payload } = body;

        if (action === 'generateScenarios') {
            const { assetBase64, brief, category } = payload;
            const cleanedBase64 = (assetBase64 || '').replace(/^data:image\/\w+;base64,/, '');

            const systemInstructions = {
                JEWELRY: "You are a Creative Director for a high-end luxury jewelry house. Propose 3 distinct cinematic visual environments for a piece of jewelry.",
                RESTAURANT: "You are a Michelin-star hospitality designer. Propose 3 distinct dining atmospheres.",
                FASHION: "You are a lead editor at a global fashion magazine. Propose 3 editorial scenarios."
            };

            const response = await ai.models.generateContent({
                model: 'gemini-3-flash-preview',
                contents: {
                    parts: [
                        { inlineData: { data: cleanedBase64, mimeType: 'image/png' } },
                        { text: `Analyze this ${category} product. Brief: ${brief}. Output 3 highly descriptive scenarios.` }
                    ]
                },
                config: {
                    systemInstruction: systemInstructions[category] || '',
                    responseMimeType: 'application/json',
                    responseSchema: {
                        type: Type.OBJECT,
                        properties: {
                            scenarios: { type: Type.ARRAY, items: { type: Type.STRING } }
                        },
                        required: ['scenarios']
                    }
                }
            });

            const parsed = JSON.parse(response.text || '{"scenarios": []}');
            return { statusCode: 200, body: JSON.stringify({ scenarios: parsed.scenarios }) };
        }

        if (action === 'generateModelImages') {
            const { base64, scenarios, category } = payload;
            const results = [];
            const cleanedBase64 = (base64 || '').replace(/^data:image\/\w+;base64,/, '');

            for (const scenario of scenarios || []) {
                const prompt = `TASK: High-Fidelity 4K Neural Integration. PRODUCT: ${category}. ENVIRONMENT: ${scenario}.`;
                try {
                    const response = await ai.models.generateContent({
                        model: 'gemini-3-pro-image-preview',
                        contents: {
                            parts: [
                                { inlineData: { data: cleanedBase64, mimeType: 'image/png' } },
                                { text: prompt }
                            ]
                        },
                        config: { imageConfig: { aspectRatio: '3:4', imageSize: '4K' } }
                    });

                    let base64Data = '';
                    if (response?.candidates?.[0]?.content?.parts) {
                        for (const part of response.candidates[0].content.parts) {
                            if (part.inlineData) base64Data = part.inlineData.data;
                        }
                    }

                    if (base64Data) {
                        results.push({ url: `data:image/png;base64,${base64Data}`, scenario, base64: base64Data });
                    }
                } catch (err) {
                    console.error('Rendering Error for scenario:', scenario, err);
                }
            }

            return { statusCode: 200, body: JSON.stringify({ results }) };
        }

        if (action === 'editImage') {
            const { originalBase64, editPrompt } = payload;
            const cleanedBase64 = (originalBase64 || '').replace(/^data:image\/\w+;base64,/, '');
            const prompt = `REFINE RENDER: ${editPrompt}. Maintain 4K resolution and high-fidelity textures.`;

            const response = await ai.models.generateContent({
                model: 'gemini-3-pro-image-preview',
                contents: { parts: [{ inlineData: { data: cleanedBase64, mimeType: 'image/png' } }, { text: prompt }] },
                config: { imageConfig: { aspectRatio: '3:4', imageSize: '4K' } }
            });

            if (response.candidates?.[0]?.content?.parts) {
                for (const part of response.candidates[0].content.parts) {
                    if (part.inlineData) return { statusCode: 200, body: JSON.stringify({ image: `data:image/png;base64,${part.inlineData.data}` }) };
                }
            }
            return { statusCode: 500, body: JSON.stringify({ error: 'Neural refinement failed.' }) };
        }

        return { statusCode: 400, body: JSON.stringify({ error: 'Unknown action' }) };
    } catch (err) {
        console.error('Function error', err);
        return { statusCode: 500, body: JSON.stringify({ error: String(err) }) };
    }
};
