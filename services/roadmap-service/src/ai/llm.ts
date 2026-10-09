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
      'LLM not configured. Set OPENAI_API_KEY in roadmap-service/.env'
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
    timeout: 120_000,
    maxRetries: 5,
    apiKey,
    openAIApiKey: apiKey,
    ...(baseURL ? {
      configuration: { baseURL },
      clientOptions: { baseURL },
    } : {}),
  });
}
