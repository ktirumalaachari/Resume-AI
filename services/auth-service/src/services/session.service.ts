import { redis } from '../lib/redis';
import { env } from '../config/env';

export interface SessionData {
  uid: string;
  createdAt: number;
}

const sessionKey = (uid: string) => `session:${uid}`;
const memorySessions = new Map<string, { data: SessionData; expiresAt: number }>();

export async function createSession(uid: string): Promise<void> {
  const data: SessionData = { uid, createdAt: Date.now() };
  try {
    await redis.set(sessionKey(uid), JSON.stringify(data), 'EX', env.sessionTtlSeconds);
  } catch (err) {
    memorySessions.set(sessionKey(uid), {
      data,
      expiresAt: Date.now() + env.sessionTtlSeconds * 1000,
    });
  }
}

export async function getSession(uid: string): Promise<SessionData | null> {
  try {
    const raw = await redis.get(sessionKey(uid));
    if (raw) {
      return JSON.parse(raw) as SessionData;
    }
  } catch {}

  const cached = memorySessions.get(sessionKey(uid));
  if (cached) {
    if (cached.expiresAt > Date.now()) {
      return cached.data;
    }
    memorySessions.delete(sessionKey(uid));
  }
  return null;
}

export async function deleteSession(uid: string): Promise<void> {
  try {
    await redis.del(sessionKey(uid));
  } catch {}
  memorySessions.delete(sessionKey(uid));
}
