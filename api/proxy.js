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
    // Vercel uses process.env for environment variables in serverless functions.
    const apiKey = process.env.GEMINI_API_KEY;

    // 3. Check if the API key is configured.
    if (!apiKey) {
        return new Response(JSON.stringify({ error: 'API key not configured on server. Check Vercel environment variables.' }), {
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

        // 6. Transform the message history into Gemini's required format.
        const contents = messages.map(msg => ({
            role: msg.role === 'assistant' ? 'model' : 'user', // Map 'assistant' to 'model'
            parts: [{ text: msg.content }]
        }));

        // 7. Construct the final payload for the Gemini API.
        const payload = {
            contents: contents,
            systemInstruction: {
                parts: [{ text: systemPrompt }]
            },
        };
        
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-1.5:generateContent?key=${apiKey}`;

        // 8. Make the actual request to the Google Gemini API.
        const geminiResponse = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
        });

        // 9. Handle errors from the Gemini API.
        if (!geminiResponse.ok) {
            const errorText = await geminiResponse.text();
            console.error("Gemini API Error:", errorText);
            return new Response(JSON.stringify({ error: `Gemini API Error: ${errorText}` }), {
                status: geminiResponse.status,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        // 10. Parse the response and extract the generated text.
        const result = await geminiResponse.json();
        const candidate = result.candidates?.[0];
        const generatedText = candidate?.content?.parts?.[0]?.text;
        
        // 11. Wrap the response in the format the client-side code expects.
        // This avoids having to change the client-side parsing logic.
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

// Vercel Edge runtime configuration
export const config = {
  runtime: 'edge',
};
