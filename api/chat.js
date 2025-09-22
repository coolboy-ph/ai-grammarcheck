// This function acts as a secure proxy to the OpenRouter API.
// It runs on Vercel's servers, not in the user's browser.

export default async function handler(request, response) {
    // Only allow POST requests
    if (request.method !== 'POST') {
        return response.status(405).json({ error: 'Method Not Allowed' });
    }

    // Retrieve the API key securely from Vercel's environment variables
    const openRouterApiKey = process.env.OPENROUTER_API_KEY;
    const openRouterApiEndpoint = "https://openrouter.ai/api/v1/chat/completions";

    // Handle cases where the API key might not be configured on the server
    if (!openRouterApiKey) {
        return response.status(500).json({ error: "Server configuration error: API key is not set." });
    }

    try {
        // Get the model and messages from the front-end's request
        const { model, messages } = request.body;

        // Call the OpenRouter API from the server, including the secret API key
        const apiResponse = await fetch(openRouterApiEndpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${openRouterApiKey}`
            },
            body: JSON.stringify({
                model: model,
                messages: messages
            })
        });

        // If the OpenRouter API returns an error, forward it to the front-end
        if (!apiResponse.ok) {
            const errorBody = await apiResponse.text();
            return response.status(apiResponse.status).json({ error: `OpenRouter API error: ${errorBody}` });
        }

        // If the call is successful, send the data from OpenRouter back to the front-end
        const data = await apiResponse.json();
        return response.status(200).json(data);

    } catch (error) {
        console.error("Error in serverless function:", error);
        return response.status(500).json({ error: "An internal server error occurred." });
    }
}
