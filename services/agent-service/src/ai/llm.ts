import { ChatOpenAI } from '@langchain/openai';
import { env } from '../config/env';
import { HttpError } from '../middleware/errorHandler';

function cleanApiKey(key?: string): string {
  if (!key) return '';
  let cleaned = key.trim();
  if ((cleaned.startsWith('"') && cleaned.endsWith('"')) || (cleaned.startsWith("'") && cleaned.endsWith("'"))) {
    cleaned = cleaned.slice(1, -1).trim();
  }
  return cleaned;
}

export function getLlm(): ChatOpenAI {
  const apiKey = cleanApiKey(env.openai.apiKey || process.env.OPENAI_API_KEY);
  if (!apiKey) {
    throw new HttpError(
      503,
      'LLM not configured. Set OPENAI_API_KEY in agent-service/.env'
    );
  }

  const isGroq = apiKey.startsWith('gsk_');
  const baseURL = env.openai.baseUrl || process.env.OPENAI_BASE_URL || (isGroq ? 'https://api.groq.com/openai/v1' : undefined);
  const model = (env.openai.model && env.openai.model !== 'gpt-4o-mini')
    ? env.openai.model
    : (process.env.OPENAI_MODEL || (isGroq ? 'openai/gpt-oss-120b' : 'gpt-4o-mini'));

  return new ChatOpenAI({
    model,
    temperature: 0.2,
    timeout: 60_000,
    maxRetries: 2,
    apiKey,
    openAIApiKey: apiKey,
    ...(baseURL ? {
      configuration: { baseURL },
      clientOptions: { baseURL },
    } : {}),
  });
}

const RATE_LIMIT_DELAY_MS = 2000;

function isRateLimitError(err: unknown): boolean {
  if (err instanceof Error) {
    const msg = err.message.toLowerCase();
    return msg.includes('429') || msg.includes('rate limit') || msg.includes('tokens per minute');
  }
  return false;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function withRetry<T>(fn: () => Promise<T>, label: string, maxAttempts = 3): Promise<T> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (isRateLimitError(err) && attempt < maxAttempts) {
        const delay = RATE_LIMIT_DELAY_MS * attempt;
        console.warn(
          JSON.stringify({
            level: 'warn',
            service: 'agent-service',
            msg: `${label} rate-limited (attempt ${attempt}/${maxAttempts}), retrying in ${delay}ms`,
          })
        );
        await sleep(delay);
        continue;
      }
      throw err;
    }
  }
  throw lastError;
}
