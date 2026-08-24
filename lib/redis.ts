import { Redis } from '@upstash/redis';

let client: Redis | undefined;

export function getRedis() {
  if (client) return client;
  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;
  if (!url || !token) throw new Error('Redis is unavailable because KV_REST_API_URL or KV_REST_API_TOKEN is missing.');
  client = new Redis({ url, token });
  return client;
}
