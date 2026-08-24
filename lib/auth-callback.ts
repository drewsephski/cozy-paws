export function safeAuthCallbackURL(value?: string | null) {
  return value?.startsWith('/') && !value.startsWith('//') ? value : '/admin';
}
