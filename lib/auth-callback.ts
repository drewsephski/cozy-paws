const AUTH_FALLBACK = '/admin';
const AUTH_BASE = 'https://sitterfolio.invalid';
const CONTROL_CHARACTER = /[\u0000-\u001f\u007f]/;
const ENCODED_PATH_SEPARATOR = /%(?:2f|5c)/i;

export function safeAuthCallbackURL(value?: string | null) {
  if (!value || !value.startsWith('/') || value.startsWith('//') || value.includes('\\') || CONTROL_CHARACTER.test(value)) {
    return AUTH_FALLBACK;
  }

  const path = value.split(/[?#]/, 1)[0];
  if (ENCODED_PATH_SEPARATOR.test(path)) return AUTH_FALLBACK;

  try {
    const decodedPath = decodeURIComponent(path);
    if (decodedPath.startsWith('//') || decodedPath.includes('\\') || CONTROL_CHARACTER.test(decodedPath)) return AUTH_FALLBACK;

    const parsed = new URL(value, AUTH_BASE);
    if (parsed.origin !== AUTH_BASE || parsed.username || parsed.password) return AUTH_FALLBACK;
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return AUTH_FALLBACK;
  }
}
