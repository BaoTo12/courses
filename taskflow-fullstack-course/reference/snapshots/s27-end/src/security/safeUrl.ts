// S26 (26.06): a URL from a user is attacker-controlled input. Allow-list the PROTOCOL; never block-list.

const ALLOWED_PROTOCOLS = new Set(['http:', 'https:', 'mailto:']);

/**
 * The URL to put in an href, or `undefined` if it isn't safe to link to.
 * - Parsed with the URL API (the same parser the browser uses), so tricks like `JaVaScRiPt:`, `java\tscript:`,
 *   leading spaces or entity-encoding don't slip past a string check.
 * - Relative URLs resolve against the app's origin and are allowed (they stay on our site).
 * - Anything else (`javascript:`, `data:`, `vbscript:`, `file:`, custom app schemes) is refused.
 */
export function safeHref(raw: string, base = window.location.origin): string | undefined {
  let url: URL;
  try {
    url = new URL(raw.trim(), base);
  } catch {
    return undefined; // not a URL at all
  }
  return ALLOWED_PROTOCOLS.has(url.protocol) ? url.href : undefined;
}

/** True when the URL leaves our origin: open it in a new tab, without giving it `window.opener`. */
export function isExternal(href: string, base = window.location.origin): boolean {
  return new URL(href, base).origin !== new URL(base).origin;
}
