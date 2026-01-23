module.exports.handler = async function (event) {
    try {
        const apiKey = process.env.API_KEY;
        const isDevFallback = !apiKey;
        if (isDevFallback) console.warn('API_KEY not set — running in development fallback mode');

        let body = {};
        try {
            body = typeof event.body === 'string' ? JSON.parse(event.body) : (event.body || {});
        } catch (e) {
            console.error('Body parse error', String(event.body), e);
            return { statusCode: 400, body: JSON.stringify({ error: 'Invalid JSON body', raw: String(event.body), details: String(e) }) };
        }
        const { action, payload } = body;

        // handle lightweight ping without importing large SDK
        if (action === 'ping') {
            return { statusCode: 200, body: JSON.stringify({ ok: true, mode: isDevFallback ? 'dev' : 'server' }) };
        }

        let GoogleGenAI, Type, ai;

        if (action === 'ping') {
            return { statusCode: 200, body: JSON.stringify({ ok: true, mode: isDevFallback ? 'dev' : 'server' }) };
        }

        if (action === 'generateScenarios') {
            const { assetBase64, brief, category } = payload;
            if (isDevFallback) {
                const samples = [
                    `Luxurious studio-lit setting with dramatic chiaroscuro highlighting the ${category} piece.`,
                    `Ultra-minimal gallery space with soft natural window light and reflective surfaces.`,
                    `Opulent cinematic interior with warm gold accents and shallow depth-of-field.`
                ];
                return { statusCode: 200, body: JSON.stringify({ scenarios: samples }) };
            }

            // Use Google Generative Language REST API to generate text scenarios (avoids SDK import issues)
            try {
                const prompt = `You are a creative director. Analyze this ${category} product. Brief: ${brief}.

Return ONLY valid JSON with a single top-level object that has a "scenarios" array of exactly 3 short descriptive strings. Do NOT include any explanations, markdown, or extra text — only the JSON object.

Example output:
{"scenarios":["Studio-lit closeup with dramatic rim light and deep shadows.","Minimalist gallery with soft diffuse window light and reflective surfaces.","Opulent cinematic interior with warm golden highlights and shallow depth-of-field."]}

Produce the JSON now.`;
                const endpoint = `https://generativelanguage.googleapis.com/v1beta2/models/text-bison-001:generate?key=${encodeURIComponent(apiKey)}`;
                const resp = await fetch(endpoint, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ prompt: { text: prompt }, temperature: 0.2 })
                });
                const rawText = await resp.text();
                let j = null;
                try { j = JSON.parse(rawText); } catch (e) { /* keep rawText for debugging */ }
                const content = j?.candidates?.[0]?.content || j?.output?.[0]?.content || (typeof rawText === 'string' ? rawText : '');
                // Try to extract JSON from content
                let scenarios = [];
                try {
                    const maybeJson = content.match(/\{[\s\S]*\}/);
                    if (maybeJson) {
                        const parsed = JSON.parse(maybeJson[0]);
                        scenarios = parsed.scenarios || [];
                    }
                } catch (e) {
                    // fallback: split by lines and take first 3 non-empty
                }
                if (!scenarios.length) {
                    scenarios = content.split(/\n+/).map(s => s.replace(/^\d+\.?\s*/, '').trim()).filter(Boolean).slice(0, 3);
                }
                return { statusCode: 200, body: JSON.stringify({ scenarios }) };
            } catch (err) {
                console.error('Text generation error', err);
                // include raw response if available for debugging
                return { statusCode: 502, body: JSON.stringify({ error: 'Text generation failed', details: String(err), raw: typeof rawText !== 'undefined' ? rawText : null }) };
            }
        }

        if (action === 'generateModelImages') {
            const { base64, scenarios, category } = payload;
            const results = [];
            if (isDevFallback) {
                const placeholder = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR4nGMAAQAABQABDQottAAAAABJRU5ErkJggg==';
                for (const scenario of (scenarios || [])) {
                    results.push({ url: `data:image/png;base64,${placeholder}`, scenario, base64: placeholder });
                }
                return { statusCode: 200, body: JSON.stringify({ results }) };
            }

            const cleanedBase64 = (base64 || '').replace(/^data:image\/\w+;base64,/, '');

            if (!isDevFallback) {
                try {
                    const genaiModule = await import('@google/genai');
                    const genai = genaiModule.default ?? genaiModule;
                    ({ GoogleGenAI, Type } = genai);
                    ai = new GoogleGenAI({ apiKey });
                } catch (err) {
                    console.error('Failed to import SDK for image generation', err);
                    return { statusCode: 500, body: JSON.stringify({ error: 'Image SDK import failed', details: String(err) }) };
                }

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
            }

            return { statusCode: 200, body: JSON.stringify({ results }) };
        }

        if (action === 'editImage') {
            const { originalBase64, editPrompt } = payload;
            if (isDevFallback) {
                return { statusCode: 200, body: JSON.stringify({ image: originalBase64 }) };
            }

            const cleanedBase64 = (originalBase64 || '').replace(/^data:image\/\w+;base64,/, '');
            const prompt = `REFINE RENDER: ${editPrompt}. Maintain 4K resolution and high-fidelity textures.`;

            if (!isDevFallback) {
                try {
                    const genaiModule = await import('@google/genai');
                    const genai = genaiModule.default ?? genaiModule;
                    ({ GoogleGenAI, Type } = genai);
                    ai = new GoogleGenAI({ apiKey });
                } catch (err) {
                    console.error('Failed to import SDK for editImage', err);
                    return { statusCode: 500, body: JSON.stringify({ error: 'Image SDK import failed', details: String(err) }) };
                }
            }

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
