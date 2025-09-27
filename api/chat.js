// This file should be placed at: /api/chat.js in your Vercel project

export default async function handler(req, res) {
    // Set CORS headers to allow requests from your frontend
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    // Handle preflight OPTIONS request
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    // Only allow POST requests
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }
    
    // The AI's instructions are now defined on the server-side.
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


    // Get the API key from environment variables
    const openRouterApiKey = process.env.OPENROUTER_API_KEY;
    const openRouterApiEndpoint = "https://openrouter.ai/api/v1/chat/completions";

    // Check if API key exists
    if (!openRouterApiKey) {
        console.error("Server Error: OPENROUTER_API_KEY environment variable not found.");
        return res.status(500).json({ 
            error: "Server configuration error: The API key is missing on the server. Please check your Vercel environment variables." 
        });
    }

    try {
        // Validate request body
        if (!req.body || !req.body.model || !req.body.messages) {
            return res.status(400).json({ 
                error: "Bad Request: 'model' and 'messages' are required in the request body." 
            });
        }

        const { model, messages } = req.body;
        
        // Prepend the system prompt to the conversation history.
        const messagesWithSystemPrompt = [
            { role: "system", content: systemPrompt },
            ...messages
        ];

        // Make request to OpenRouter API
        const apiResponse = await fetch(openRouterApiEndpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${openRouterApiKey}`,
                'HTTP-Referer': 'https://ai-grammarcheck.vercel.app/', // Replace with your actual domain
                'X-Title': 'Grammar Check AI'
            },
            body: JSON.stringify({
                model: model,
                messages: messagesWithSystemPrompt, // Send the full conversation with the system prompt
                temperature: 0.7,
                max_tokens: 1000
            })
        });

        const responseData = await apiResponse.json();

        // Handle API errors
        if (!apiResponse.ok) {
            console.error('OpenRouter API Error:', responseData);
            return res.status(apiResponse.status).json({
                error: responseData.error?.message || 'API request failed',
                details: responseData
            });
        }

        // Return successful response
        return res.status(200).json(responseData);

    } catch (error) {
        console.error("Internal Server Error:", error);
        return res.status(500).json({ 
            error: "An internal server error occurred while contacting the API.",
            details: error.message 
        });
    }
}
