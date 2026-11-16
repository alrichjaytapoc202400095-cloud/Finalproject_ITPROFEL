// PROXY (B.5.3): AIProxy exposes the SAME interface as the real GeminiClient (ask())
// and adds caching + usage logging + input bounds in front of the real service.
const env = require('../../config/env');
const logger = require('../../utils/logger');
const { AppError } = require('../../utils/errors');

const CACHE_TTL_MS = 5 * 60 * 1000;
const MAX_INPUT_CHARS = 500;

class AIProxy {
  constructor(realClient) {
    this.real = realClient; // composition, not inheritance
    this.cache = new Map(); // question -> { expiresAt, answer }
  }

  async ask({ systemInstruction, userPrompt, question }) {
    if (question && question.length > MAX_INPUT_CHARS) {
      throw new AppError(422, 'VALIDATION_ERROR', `Please keep your question under ${MAX_INPUT_CHARS} characters.`);
    }
    const key = (question || '').trim().toLowerCase();
    const hit = this.cache.get(key);
    if (hit && hit.expiresAt > Date.now()) {
      logger.info('AIProxy: cache hit - real provider not called');
      return hit.answer;
    }
    if (hit) this.cache.delete(key);

    const answer = await this.real.ask({ systemInstruction, userPrompt });
    this.cache.set(key, { expiresAt: Date.now() + CACHE_TTL_MS, answer });
    logger.info('AIProxy: provider call succeeded and was cached');
    return answer;
  }
}

module.exports = { AIProxy, MAX_INPUT_CHARS };
