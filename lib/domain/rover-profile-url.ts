const ERROR = 'Enter a valid Rover public profile URL.';
const MEMBER_PATH = /^\/members\/([a-z0-9](?:[a-z0-9-]{0,118}[a-z0-9])?)\/$/;

export function canonicalizeRoverProfileUrl(value: unknown) {
  const input = String(value ?? '').trim();
  if (!input || /%(?:2f|5c|2e)/i.test(input) || input.includes('//members/')) throw new Error(ERROR);

  let url: URL;
  try {
    url = new URL(input);
  } catch {
    throw new Error(ERROR);
  }

  if (
    url.protocol !== 'https:' ||
    url.hostname !== 'www.rover.com' ||
    url.host !== 'www.rover.com' ||
    url.username ||
    url.password ||
    !MEMBER_PATH.test(url.pathname)
  ) throw new Error(ERROR);

  return `https://www.rover.com${url.pathname}`;
}

export function isRoverProfileUrl(value: unknown) {
  try {
    canonicalizeRoverProfileUrl(value);
    return true;
  } catch {
    return false;
  }
}
