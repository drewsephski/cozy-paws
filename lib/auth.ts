import { betterAuth } from 'better-auth';
import { nextCookies } from 'better-auth/next-js';
import { Pool } from 'pg';
import { redis } from '@/lib/redis';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 5,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined
});

export const auth = betterAuth({
  appName: 'Sitterfolio',
  database: pool,
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8
  },
  secondaryStorage: {
    get: async (key) => redis.get<string>(`auth:${key}`),
    set: async (key, value, ttl) => {
      if (ttl) {
        await redis.set(`auth:${key}`, value, { ex: ttl });
        return;
      }
      await redis.set(`auth:${key}`, value);
    },
    delete: async (key) => {
      await redis.del(`auth:${key}`);
    },
    getAndDelete: async (key) => redis.getdel<string>(`auth:${key}`),
    increment: async (key, ttl) => {
      const storageKey = `auth:${key}`;
      const value = await redis.incr(storageKey);
      if (value === 1) await redis.expire(storageKey, ttl);
      return value;
    }
  },
  session: {
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60
    }
  },
  rateLimit: {
    enabled: true,
    storage: 'secondary-storage'
  },
  plugins: [nextCookies()]
});
