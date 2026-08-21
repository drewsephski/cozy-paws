import { betterAuth } from 'better-auth';
import { nextCookies } from 'better-auth/next-js';
import { Pool } from 'pg';
import { redis } from '@/lib/redis';

const trustedOrigins = [
  'https://sitterfolio.com',
  'https://www.sitterfolio.com',
  'http://localhost:3000',
  process.env.BETTER_AUTH_URL,
  ...(process.env.BETTER_AUTH_TRUSTED_ORIGINS?.split(',') ?? [])
]
  .map((origin) => origin?.trim())
  .filter((origin): origin is string => Boolean(origin));

const baseURL =
  process.env.BETTER_AUTH_URL ||
  (process.env.NODE_ENV === 'production' ? 'https://sitterfolio.com' : 'http://localhost:3000');

function databaseUrl() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) return undefined;

  const url = new URL(connectionString);
  if (url.searchParams.has('sslmode')) {
    url.searchParams.set('sslmode', 'verify-full');
  }
  return url.toString();
}

const pool = new Pool({
  connectionString: databaseUrl(),
  max: 5
});

export const auth = betterAuth({
  appName: 'Sitterfolio',
  baseURL,
  database: pool,
  trustedOrigins,
  emailAndPassword: {
    enabled: true,
    // Accounts are usable immediately; no verification email is sent or required.
    requireEmailVerification: false,
    autoSignIn: true,
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
