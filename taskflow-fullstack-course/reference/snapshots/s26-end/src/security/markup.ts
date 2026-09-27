// S26: two ways to let users format text, both without handing them raw HTML in our page.
import DOMPurify from 'dompurify';

// ── 1. Links in descriptions: a tiny markdown subset, parsed into DATA, rendered by React (26.05) ─────

export type TextSegment = { kind: 'text'; text: string } | { kind: 'link'; label: string; url: string };

const LINK = /\[([^\]\n]{1,200})\]\(([^)\s]{1,2000})\)/g;

/** "See [the spec](https://x.test/spec)." → text, link, text. The URL is NOT validated here: SafeLink does. */
export function parseLinks(text: string): TextSegment[] {
  const segments: TextSegment[] = [];
  let last = 0;
  for (const match of text.matchAll(LINK)) {
    const [whole, label = '', url = ''] = match;
    if (match.index > last) segments.push({ kind: 'text', text: text.slice(last, match.index) });
    segments.push({ kind: 'link', label, url });
    last = match.index + whole.length;
  }
  if (last < text.length) segments.push({ kind: 'text', text: text.slice(last) });
  return segments;
}

// ── 2. "Show formatting" for comments: HTML, sanitised with DOMPurify and a STRICT allow-list (26.04) ──

const ALLOWED_TAGS = ['b', 'strong', 'i', 'em', 'u', 'code', 'pre', 'p', 'br', 'ul', 'ol', 'li', 'blockquote', 'a'];
const ALLOWED_ATTR = ['href']; // no style, no class, no on* handlers, no src

let hooksInstalled = false;
function installHooks() {
  if (hooksInstalled) return;
  hooksInstalled = true;
  // Every surviving link opens in a new tab without window.opener (same policy as SafeLink).
  DOMPurify.addHook('afterSanitizeAttributes', (node) => {
    if (node.tagName === 'A') {
      node.setAttribute('target', '_blank');
      node.setAttribute('rel', 'noopener noreferrer');
    }
  });
}

/**
 * Untrusted HTML → HTML that can't run script. DOMPurify parses it with the BROWSER's parser (so what it checks is
 * what the browser would build), removes everything not allowed, and drops dangerous URLs (`javascript:`…).
 * The result must go into the DOM AS IS: modifying it afterwards voids the guarantee (26.14).
 */
export function sanitizeHtml(dirty: string): string {
  installHooks();
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    ADD_ATTR: ['target'], // allowed so our hook's value survives; the hook overwrites whatever the user wrote
    ALLOWED_URI_REGEXP: /^(?:https?:|mailto:|\/)/i, // same allow-list as safeHref
  });
}
