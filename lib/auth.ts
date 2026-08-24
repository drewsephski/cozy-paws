import { betterAuth } from 'better-auth';
import { nextCookies } from 'better-auth/next-js';
import { pool } from './db';
import { sendPasswordResetEmail } from './email';
import { getTrustedOrigins } from './auth-origins';

const trustedOrigins = getTrustedOrigins();

const baseURL =
  process.env.BETTER_AUTH_URL ||
  (process.env.NODE_ENV === 'production' ? 'https://sitterfolio.com' : 'http://localhost:3000');

const googleClientId = process.env.GOOGLE_CLIENT_ID;
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;

export const auth = betterAuth({
  appName: 'Sitterfolio',
  baseURL,
  database: pool,
  trustedOrigins,
  socialProviders: googleClientId && googleClientSecret
    ? {
        google: {
          clientId: googleClientId,
          clientSecret: googleClientSecret
        }
      }
    : {},
  account: {
    accountLinking: {
      enabled: true,
      // Legacy password accounts were created without email verification.
      // Treat Google's verified identity as sufficient proof to link the
      // matching account so existing users can adopt Google sign-in.
      requireLocalEmailVerified: false,
      trustedProviders: ['google']
    }
  },
  emailAndPassword: {
    enabled: true,
    // Accounts are usable immediately; no verification email is sent or required.
    requireEmailVerification: false,
    autoSignIn: true,
    minPasswordLength: 8,
    resetPasswordTokenExpiresIn: 30 * 60,
    revokeSessionsOnPasswordReset: true,
    sendResetPassword: async ({ user, url }) => {
      await sendPasswordResetEmail({ email: user.email, url });
    }
  },
  session: {
    // Keep the authoritative session in Neon so sign-in does not depend on KV.
    storeSessionInDatabase: true,
    expiresIn: 30 * 24 * 60 * 60,
    updateAge: 24 * 60 * 60
  },
  plugins: [nextCookies()]
});
