import { betterAuth } from 'better-auth';
import { nextCookies } from 'better-auth/next-js';
import { pool } from './db';

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
  session: {
    // Keep the authoritative session in Neon so sign-in does not depend on KV.
    storeSessionInDatabase: true,
    expiresIn: 30 * 24 * 60 * 60,
    updateAge: 24 * 60 * 60
  },
  plugins: [nextCookies()]
});
