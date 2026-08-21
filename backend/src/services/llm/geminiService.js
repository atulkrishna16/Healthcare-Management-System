const { GoogleGenerativeAI } = require('@google/generative-ai');

let genAI;

function getGenAI() {
  if (!genAI) {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY not set');
    }
    genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  }
  return genAI;
}

/**
 * Call Google Gemini API with JSON output mode.
 * @param {string} prompt
 * @returns {Promise<string>} JSON string
 */
async function callGemini(prompt) {
  const ai = getGenAI();
  const model = ai.getGenerativeModel({
    model: 'gemini-3.6-flash',
    generationConfig: {
      responseMimeType: 'application/json',
    },
  });

  const result = await model.generateContent(prompt);
  return result.response.text();
}

module.exports = { callGemini };
