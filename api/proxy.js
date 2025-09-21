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

        // Define the system prompt on the server-side for security and control.
        const systemPrompt = `You are a Grammar Check assistant. If the user's input is in Burmese, first translate it to English. Then, provide the grammar correction for the translated English sentence.
Your job is to check the user’s English sentence and respond using the following rules and format.
Rules:
- Always be clear and concise.
- Use simple language; avoid overly technical grammar jargon.
- Focus on improving fluency and natural expression.
- When possible, point out the exact phrase changed and why.
- Do not use <br> tags for line breaks; use natural line breaks.
- Use a dash (-) for bullet points.
Format:
<b>✅ Corrected Sentence</b>
- Provide the corrected version with proper grammar.
<b>📝 Explanation</b>
- Explain the grammar mistakes and corrections in simple, clear language. Keep the explanation short and actionable.
<b>💡 Alternative Expressions</b>
- Suggest 1–3 alternative natural ways to say the same thing (short, natural examples).
<b>📚 Learning Tip</b>
- Give a short, practical grammar/vocabulary tip related to the mistake so the user can remember it in the future.`;

        // Create the final messages array, starting with our secure system prompt.
        const finalMessages = [{ role: "system", content: systemPrompt }];

        // Add user/assistant messages from the client, skipping any system messages from the client.
        messages.forEach(msg => {
            if (msg.role !== 'system') {
                finalMessages.push(msg);
            }
        });

        // 5. Make the actual request to the OpenRouter API.
        const openRouterResponse = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
                model: "deepseek/deepseek-chat-v3.1:free",
                messages: finalMessages, // Use the new, secure messages array
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

