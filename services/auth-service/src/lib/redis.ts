import Redis from 'ioredis';
import { env } from '../config/env';

export const redis = new Redis(env.redisUrl, {
  maxRetriesPerRequest: 1,
  retryStrategy(times) {
    if (times > 3) return null;
    return Math.min(times * 500, 2000);
  },
  lazyConnect: true,
});

redis.on('error', (err) => {
  console.error(
    JSON.stringify({ level: 'error', service: 'auth-service', msg: 'Redis error', message: err.message })
  );
});

redis.on('connect', () => {
  console.log(JSON.stringify({ level: 'info', service: 'auth-service', msg: 'Redis connected' }));
});

export async function disconnectRedis(): Promise<void> {
  redis.disconnect();
}

export async function isRedisReady(): Promise<boolean> {
  try {
    const result = await redis.ping();
    return result === 'PONG';
  } catch {
    return false;
  }
}
