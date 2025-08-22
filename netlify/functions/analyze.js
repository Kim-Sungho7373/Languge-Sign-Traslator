// This file should be at: netlify/functions/analyze.js
const fetch = require('node-fetch');

exports.handler = async (event) => {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: JSON.stringify({ error: 'Method Not Allowed' }) };
    }

    try {
        const { image, mimeType } = JSON.parse(event.body);
        if (!image || !mimeType) {
            return { statusCode: 400, body: JSON.stringify({ error: 'Missing image data' }) };
        }

        const apiKey = process.env.GOOGLE_API_KEY;
        if (!apiKey) {
            return { statusCode: 500, body: JSON.stringify({ error: 'API key is not configured' }) };
        }

        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${apiKey}`;

        const emotions = ['Joy', 'Trust', 'Fear', 'Surprise', 'Sadness', 'Disgust', 'Anger', 'Anticipation'];
        
        const prompt = `You are an expert art docent. Analyze the provided image and return a JSON object with the following structure:
{
  "title": "Identify the title of this artwork. If it's not a famous piece, respond with 'Unknown'.",
  "artist": "Identify the artist of this artwork. If unknown, respond with 'Unknown'.",
  "analysis": "Based on the artwork's identity, artist, and historical context, provide a short, insightful analysis (2-3 sentences). If the artwork is unknown, provide an analysis based on its visual style and composition.",
  "emotion": "From the list [${emotions.join(', ')}], choose the single most dominant emotion conveyed by the artwork.",
  "question": "Based on your analysis, formulate one short, thought-provoking question to encourage the viewer to look closer and think deeper."
}`;
        
        const payload = {
            contents: [{
                parts: [
                    { text: prompt },
                    { inlineData: { mimeType: mimeType, data: image } }
                ]
            }],
            generationConfig: {
                responseMimeType: "application/json",
            }
        };

        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error('Google AI API Error:', errorData);
            return { statusCode: response.status, body: JSON.stringify({ error: 'Failed to get analysis from AI.' }) };
        }

        const result = await response.json();
        const analysisText = result.candidates?.[0]?.content?.parts?.[0]?.text;

        return {
            statusCode: 200,
            headers: { 'Content-Type': 'application/json' },
            body: analysisText
        };

    } catch (error) {
        console.error('Serverless function error:', error);
        return { statusCode: 500, body: JSON.stringify({ error: 'An internal error occurred.' }) };
    }
};
