exports.handler = async () => {
  try {
    console.log("DEBUG: OPENAI_API_KEY present?", !!process.env.OPENAI_API_KEY);
    return { statusCode: 200, body: JSON.stringify({ hasOpenAIKey: !!process.env.OPENAI_API_KEY }) };
  } catch (e) {
    console.error("env-check error:", e);
    return { statusCode: 500, body: JSON.stringify({ error: e.message }) };
  }
};
