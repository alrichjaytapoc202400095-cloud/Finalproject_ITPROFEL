// The REAL AI client (used only through AIProxy). Calls Google Gemini over REST.
// Failure of any kind is mapped to a controlled AppError(503, 'AI_UNAVAILABLE').
const env = require('../../config/env');
const { AppError } = require('../../utils/errors');
const logger = require('../../utils/logger');

class GeminiClient {
  constructor() {
    this.endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${env.geminiModel}:generateContent`;
    this.timeoutMs = env.aiTimeoutMs;
  }

  async ask({ systemInstruction, userPrompt }) {
    if (!env.geminiApiKey) throw new AppError(503, 'AI_UNAVAILABLE', 'The AI assistant is not configured.');
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const res = await fetch(`${this.endpoint}?key=${encodeURIComponent(env.geminiApiKey)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemInstruction }] },
          contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
          generationConfig: { responseMimeType: 'application/json', maxOutputTokens: 1024, temperature: 0.3 },
        }),
      });
      if (!res.ok) {
        logger.warn(`Gemini API returned HTTP ${res.status}`);
        throw new AppError(503, 'AI_UNAVAILABLE', 'The AI assistant is temporarily unavailable.');
      }
      const json = await res.json();
      const text = json.candidates && json.candidates[0] && json.candidates[0].content
        ? json.candidates[0].content.parts.map((p) => p.text || '').join('')
        : '';
      if (!text) throw new AppError(503, 'AI_UNAVAILABLE', 'The AI assistant returned an empty response.');
      return text;
    } catch (e) {
      if (e instanceof AppError) throw e;
      throw new AppError(503, 'AI_UNAVAILABLE', 'The AI assistant is temporarily unavailable.');
    } finally {
      clearTimeout(timer);
    }
  }
}

module.exports = { GeminiClient };
