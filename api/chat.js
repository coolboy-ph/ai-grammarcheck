// This file should be placed at: /api/chat.js in your Vercel project

export default async function handler(req, res) {
    // --- Basic Server Setup ---
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    // --- System Prompt (Instructions for the AI) ---
    const systemPrompt = `You are a Grammar Checker. Your job is to check the user's English sentence and respond using the following rules and format. If the user's input is in Burmese, first translate it to English, then respond only with the Corrected Sentence and Alternative Expressions sections.

Rules:
- Always be clear and concise.
- Use simple language; avoid technical grammar jargon.
- Focus on improving fluency and natural expression.
- Point out the exact phrase changed and explain why (keep it short).
- Use natural line breaks, not <br> tags.
- Use a dash (-) for bullet points.
- Add a Speaking Practice section that teaches learners how to expand their ideas, connect sentences, and sound more confident.

Format:
✅ **Corrected Sentence**
Provide the corrected version with proper grammar.

📝 **Explanation**
Explain the mistakes and corrections in simple, clear language.

💡 **Alternative Expressions**
Suggest 1–3 natural alternative ways to say the same thing.

📚 **Learning Tip**
Share a short, practical tip related to the mistake to help the user remember.

🎤 **Speaking Practice**
Give an example of how a native speaker might expand the idea in conversation (3-5 sentences, no need explanation).

Special Rule for Burmese Input:
If the input is in Burmese, translate it to English and provide only:
✅ **Corrected Sentence**
💡 **Alternative Expressions**`;

    // --- Gemini API Configuration ---
    const geminiApiKey = process.env.GEMINI_API_KEY;
    const modelName = 'gemini-2.5-flash'; // Or another model like 'gemini-pro'
    const geminiApiEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${geminiApiKey}`;

    if (!geminiApiKey) {
        console.error("Server Error: GEMINI_API_KEY environment variable not found.");
        return res.status(500).json({
            error: "Server configuration error: The API key is missing. Please check your Vercel environment variables."
        });
    }

    try {
        const { messages } = req.body;
        if (!messages) {
            return res.status(400).json({ error: "Bad Request: 'messages' are required." });
        }

        // --- Data Transformation for Gemini API ---
        // Gemini requires a different format ('model' instead of 'assistant')
        const contents = messages.map(msg => ({
            role: msg.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: msg.content }]
        }));

        // --- Call the Gemini API ---
        const apiResponse = await fetch(geminiApiEndpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: contents,
                systemInstruction: {
                    parts: [{ text: systemPrompt }]
                },
                generationConfig: {
                    temperature: 0.7,
                    maxOutputTokens: 1000,
                }
            })
        });

        const responseData = await apiResponse.json();

        if (!apiResponse.ok) {
            console.error('Gemini API Error:', responseData);
            const errorMsg = responseData.error?.message || 'API request failed';
            return res.status(apiResponse.status).json({ error: errorMsg });
        }
        
        // --- Format Response for Frontend ---
        // Extract the text and wrap it in the format the frontend expects.
        const textResponse = responseData.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!textResponse) {
             throw new Error("Invalid response format from Gemini API");
        }
        
        const formattedResponse = {
            choices: [{
                message: {
                    content: textResponse
                }
            }]
        };

        return res.status(200).json(formattedResponse);

    } catch (error) {
        console.error("Internal Server Error:", error);
        return res.status(500).json({
            error: "An internal server error occurred.",
            details: error.message
        });
    }
}
