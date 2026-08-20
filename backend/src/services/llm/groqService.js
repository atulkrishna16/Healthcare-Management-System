const Groq = require('groq-sdk');

let groqClient;

function getGroq() {
  if (!groqClient) {
    if (!process.env.GROQ_API_KEY) {
      throw new Error('GROQ_API_KEY not set');
    }
    groqClient = new Groq({ apiKey: process.env.GROQ_API_KEY });
  }
  return groqClient;
}

/**
 * Call Groq API requesting JSON output.
 * @param {string} prompt
 * @returns {Promise<string>} JSON string
 */
async function callGroq(prompt) {
  const client = getGroq();

  const completion = await client.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: [
      {
        role: 'system',
        content:
          'You are a helpful medical assistant. Always respond with valid JSON only. No markdown, no explanation — just the JSON object.',
      },
      { role: 'user', content: prompt },
    ],
    temperature: 0.3,
    response_format: { type: 'json_object' },
  });

  return completion.choices[0]?.message?.content || '{}';
}

module.exports = { callGroq };
