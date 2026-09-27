/**
 * 🛡 Open-redirect protection (preview of S24/S41): only allow app-internal paths.
 * Accepts "/tasks/5?x=1". Rejects "https://evil.example", "//evil.example" (protocol-relative),
 * "/\evil.example" (browsers may normalise the backslash to a slash), and anything not starting with "/".
 */
export function safeReturnTo(value: string | null, fallback = '/tasks'): string {
  if (value === null) return fallback;
  if (!value.startsWith('/')) return fallback;
  if (value.startsWith('//') || value.startsWith('/\\')) return fallback;
  return value;
}
