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

        const apiKey = process.env.GPT_API_KEY;
        if (!apiKey) {
            return { statusCode: 500, body: JSON.stringify({ error: 'GPT API key is not configured' }) };
        }

        const apiUrl = 'https://api.openai.com/v1/chat/completions';
        const emotions = ['Joy', 'Trust', 'Fear', 'Surprise', 'Sadness', 'Disgust', 'Anger', 'Anticipation'];

        const prompt = `Analyze this artwork image and respond with ONLY a valid JSON object in exactly this format:

{"title":"artwork title or Unknown","artist":"artist name or Unknown","analysis":"2-3 sentence analysis","emotion":"one of: ${emotions.join(', ')}","question":"thoughtful question about the artwork"}

No other text, no formatting, just the JSON object.`;

        const payload = {
            model: "gpt-4o",
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
            temperature: 0.3
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
            console.error('No content in AI response:', result);
            return {
                statusCode: 500,
                body: JSON.stringify({ error: 'No response from AI.' })
            };
        }

        try {
            // **JSON 파싱 로직 개선**
            const jsonStart = analysisText.indexOf('{');
            const jsonEnd = analysisText.lastIndexOf('}');
            let jsonString = analysisText.substring(jsonStart, jsonEnd + 1);

            // 가끔 JSON 키가 따옴표 없이 반환되는 문제를 처리 (예: {emotion:"Joy"} -> {"emotion":"Joy"})
            // 이 정규식은 추가적인 안정성 확보를 위한 것이며, 완벽하지 않을 수 있습니다.
            jsonString = jsonString.replace(/([a-zA-Z0-9_]+):/g, '"$1":');

            const analysisJSON = JSON.parse(jsonString);

            // 필수 필드 검증 (이 부분은 기존 코드와 동일하게 유효)
            if (!analysisJSON.emotion || !analysisJSON.analysis) {
                throw new Error('Missing required fields in AI response');
            }

            return {
                statusCode: 200,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(analysisJSON)
            };

        } catch (parseError) {
            console.error('JSON parsing error:', parseError);
            console.error('Response that failed to parse:', analysisText);

            const fallbackResponse = {
                title: "Unknown",
                artist: "Unknown",
                analysis: "Unable to analyze this artwork at the moment.",
                emotion: "Joy",
                question: "What emotions does this artwork evoke in you?"
            };

            return {
                statusCode: 200,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(fallbackResponse)
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