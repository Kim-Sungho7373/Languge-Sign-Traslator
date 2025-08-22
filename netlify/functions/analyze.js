// netlify/functions/analyze.js
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

        // OpenAI API Key로 변경
        const apiKey = process.env.OPENAI_API_KEY;
        if (!apiKey) {
            return { statusCode: 500, body: JSON.stringify({ error: 'OpenAI API key is not configured' }) };
        }

        // OpenAI API 엔드포인트
        const apiUrl = 'https://api.openai.com/v1/chat/completions';

        const emotions = ['Joy', 'Trust', 'Fear', 'Surprise', 'Sadness', 'Disgust', 'Anger', 'Anticipation'];
        
        const prompt = `You are an expert art docent. Analyze the provided image and return ONLY a valid JSON object with the following structure (no additional text or formatting):
{
  "title": "Identify the title of this artwork. If it's not a famous piece, respond with 'Unknown'.",
  "artist": "Identify the artist of this artwork. If unknown, respond with 'Unknown'.",
  "analysis": "Based on the artwork's identity, artist, and historical context, provide a short, insightful analysis (2-3 sentences). If the artwork is unknown, provide an analysis based on its visual style and composition.",
  "emotion": "From the list [${emotions.join(', ')}], choose the single most dominant emotion conveyed by the artwork.",
  "question": "Based on your analysis, formulate one short, thought-provoking question to encourage the viewer to look closer and think deeper."
}`;

        // OpenAI API 요청 형식
        const payload = {
            model: "gpt-4o", // 또는 "gpt-4-vision-preview"
            messages: [
                {
                    role: "user",
                    content: [
                        { type: "text", text: prompt },
                        { 
                            type: "image_url", 
                            image_url: { 
                                url: `data:${mimeType};base64,${image}` 
                            } 
                        }
                    ]
                }
            ],
            max_tokens: 1000,
            temperature: 0.7
        };

        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error('OpenAI API Error:', errorData);
            return { 
                statusCode: response.status, 
                body: JSON.stringify({ error: 'Failed to get analysis from AI.' }) 
            };
        }

        const result = await response.json();
        const analysisText = result.choices?.[0]?.message?.content;

        if (!analysisText) {
            return { 
                statusCode: 500, 
                body: JSON.stringify({ error: 'Invalid response from AI.' }) 
            };
        }

        // JSON 파싱 시도
        try {
            const analysisJSON = JSON.parse(analysisText);
            return {
                statusCode: 200,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(analysisJSON)
            };
        } catch (parseError) {
            console.error('JSON parsing error:', parseError);
            return { 
                statusCode: 500, 
                body: JSON.stringify({ error: 'Failed to parse AI response.' }) 
            };
        }

    } catch (error) {
        console.error('Serverless function error:', error);
        return { 
            statusCode: 500, 
            body: JSON.stringify({ error: 'An internal error occurred.' }) 
        };
    }
};
