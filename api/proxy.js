// Vercel Serverless Function
// This file should be placed in the `/api` directory of your project.
// Vercel will automatically deploy it as a serverless function.

export default async function handler(request) {
    // 1. We only accept POST requests.
    if (request.method !== 'POST') {
        return new Response(JSON.stringify({ error: 'Method not allowed' }), {
            status: 405,
            headers: { 'Content-Type': 'application/json' },
        });
    }

    // 2. Get the API key from Vercel's environment variables.
    const apiKey = process.env.OPENROUTER_API_KEY;

    // 3. Check if the API key is configured.
    if (!apiKey) {
        return new Response(JSON.stringify({ error: 'API key not configured on server' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }

    try {
        // 4. Get the messages payload from the client's request body.
        const { messages } = await request.json();

        // 5. Make the actual request to the OpenRouter API.
        const openRouterResponse = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
                model: "x-ai/grok-4-fast:free",
                messages: messages,
            }),
        });

        // 6. Handle errors from the OpenRouter API.
        if (!openRouterResponse.ok) {
            const errorText = await openRouterResponse.text();
            console.error("OpenRouter API Error:", errorText);
            return new Response(JSON.stringify({ error: `OpenRouter API Error: ${errorText}` }), {
                status: openRouterResponse.status,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        // 7. Stream the response back to our client.
        const data = await openRouterResponse.json();
        
        return new Response(JSON.stringify(data), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        });

    } catch (error) {
        console.error("Proxy Internal Error:", error);
        return new Response(JSON.stringify({ error: 'Internal server error in proxy' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
}

// Vercel Edge runtime configuration
export const config = {
  runtime: 'edge',
};
