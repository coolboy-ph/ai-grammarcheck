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
                messages: messages,
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
