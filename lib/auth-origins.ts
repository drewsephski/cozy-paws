type AuthEnvironment = Record<string, string | undefined>;

export function getTrustedOrigins(env: AuthEnvironment = process.env) {
  return [
    'https://sitterfolio.com',
    'https://www.sitterfolio.com',
    // Public Site auth runs on the sitter's host so the resulting host-only
    // session cookie is available when the customer returns to /message/*.
    'https://*.sitterfolio.com',
    'http://localhost:3000',
    env.BETTER_AUTH_URL,
    ...(env.BETTER_AUTH_TRUSTED_ORIGINS?.split(',') ?? [])
  ]
    .map((origin) => origin?.trim())
    .filter((origin): origin is string => Boolean(origin));
}
