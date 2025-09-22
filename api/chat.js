// Using CommonJS syntax for better compatibility in Vercel's Node.js runtime.
module.exports = async (request, response) => {
    // Only allow POST requests, which is what our front-end sends.
    if (request.method !== 'POST') {
        return response.status(405).json({ error: 'Method Not Allowed' });
    }

    // Securely access the API key from your Vercel project's environment variables.
    const openRouterApiKey = process.env.OPENROUTER_API_KEY;
    const openRouterApiEndpoint = "https://openrouter.ai/api/v1/chat/completions";

    // If the API key isn't found, send a clear error message back.
    if (!openRouterApiKey) {
        console.error("Server Error: OPENROUTER_API_KEY environment variable not found.");
        return response.status(500).json({ error: "Server configuration error: The API key is missing on the server. Please double-check your Vercel project settings." });
    }

    try {
        // Ensure the request from the front-end has the data we need.
        if (!request.body || !request.body.model || !request.body.messages) {
            return response.status(400).json({ error: "Bad Request: 'model' and 'messages' are required in the request body." });
        }

        const { model, messages } = request.body;

        // Forward the request to the OpenRouter API, including the secret key in the header.
        const apiResponse = await fetch(openRouterApiEndpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${openRouterApiKey}`,
            },
            body: JSON.stringify({
                model: model,
                messages: messages,
            })
        });

        // Get the response data from OpenRouter.
        const responseData = await apiResponse.json();

        // If OpenRouter returned an error (e.g., invalid key), forward that error.
        if (!apiResponse.ok) {
            console.error('OpenRouter API Error:', responseData);
            return response.status(apiResponse.status).json(responseData);
        }

        // If everything is successful, send the data back to the front-end.
        return response.status(200).json(responseData);

    } catch (error) {
        console.error("Internal Server Error in serverless function:", error);
        return response.status(500).json({ error: "An internal server error occurred while contacting the API." });
    }
};

