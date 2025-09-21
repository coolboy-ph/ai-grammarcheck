// Vercel Serverless Function
// This file should be placed in the `/api` directory of your project.

export default async function handler(request) {
    // 1. We only accept POST requests.
    if (request.method !== 'POST') {
        return new Response(JSON.stringify({ error: 'Method not allowed' }), {
            status: 405,
            headers: { 'Content-Type': 'application/json' },
        });
    }

    // 2. Get the API key from Vercel's environment variables.
    // Note: We are now using OPENROUTER_API_KEY
    const apiKey = process.env.OPENROUTER_API_KEY;

    // 3. Check if the API key is configured.
    if (!apiKey) {
        return new Response(JSON.stringify({ error: 'API key not configured on server. Check Vercel environment variables for OPENROUTER_API_KEY.' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }

    try {
        // 4. Get the messages payload from the client's request body.
        const { messages } = await request.json();

        // 5. Define the system prompt on the server-side for security and control.
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

        // 6. Transform the message history into OpenRouter's required format.
        // The first message is the system prompt.
        const openRouterMessages = [
            { role: 'system', content: systemPrompt },
            ...messages // The client already sends messages in the correct {role, content} format.
        ];

        // 7. Construct the final payload for the OpenRouter API.
        const payload = {
            model: "x-ai/grok-4-fast:free",
            messages: openRouterMessages,
        };
        
        const apiUrl = `https://openrouter.ai/api/v1/chat/completions`;

        // 8. Make the actual request to the OpenRouter API.
        const openRouterResponse = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify(payload),
        });

        // 9. Handle errors from the OpenRouter API.
        if (!openRouterResponse.ok) {
            const errorText = await openRouterResponse.text();
            console.error("OpenRouter API Error:", errorText);
            return new Response(JSON.stringify({ error: `OpenRouter API Error: ${errorText}` }), {
                status: openRouterResponse.status,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        // 10. Parse the response and extract the generated text.
        const result = await openRouterResponse.json();
        const generatedText = result.choices?.[0]?.message?.content;
        
        // 11. Wrap the response in the format the client-side code expects.
        // This format happens to be identical to what the client expects.
        const clientResponse = {
            choices: [{
                message: {
                    content: generatedText || "I'm sorry, I couldn't get a valid response from the AI."
                }
            }]
        };

        return new Response(JSON.stringify(clientResponse), {
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

// By removing the config block below, this function will default to the standard 
// Node.js serverless runtime, which is more reliable for accessing environment variables.
/*
export const config = {
  runtime: 'edge',
};
*/

