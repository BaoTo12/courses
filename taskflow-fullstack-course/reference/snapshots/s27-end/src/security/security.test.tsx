// @vitest-environment jsdom
// S26: URL allow-list, SafeLink, link parsing, DOMPurify policy, and what React itself does with dangerous values.
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { parseLinks, sanitizeHtml } from './markup';
import { SafeLink } from './SafeLink';
import { isExternal, safeHref } from './safeUrl';

const BASE = 'http://localhost:3000';

describe('safeHref (26.06)', () => {
  it.each([
    ['https://example.com/a?b=1', 'https://example.com/a?b=1'],
    ['mailto:alice@example.com', 'mailto:alice@example.com'],
    ['/tasks/5', `${BASE}/tasks/5`],
    ['  https://example.com', 'https://example.com/'],
  ])('allows %s', (raw, expected) => {
    expect(safeHref(raw, BASE)).toBe(expected);
  });

  it.each(['javascript:alert(1)', 'JaVaScRiPt:alert(1)', ' javascript:alert(1)', 'java\tscript:alert(1)', 'data:text/html,<script>alert(1)</script>', 'vbscript:msgbox(1)', 'file:///etc/passwd'])(
    'refuses %s',
    (raw) => {
      expect(safeHref(raw, BASE)).toBeUndefined();
    },
  );

  it('knows external from internal', () => {
    expect(isExternal('https://evil.example/', BASE)).toBe(true);
    expect(isExternal(`${BASE}/tasks`, BASE)).toBe(false);
  });
});

describe('SafeLink', () => {
  it('external links get a new tab without opener; unsafe ones become text', () => {
    expect(renderToStaticMarkup(<SafeLink href="https://example.com">x</SafeLink>)).toBe(
      '<a href="https://example.com/" title="https://example.com/" target="_blank" rel="noopener noreferrer">x</a>',
    );
    expect(renderToStaticMarkup(<SafeLink href="javascript:alert(1)">x</SafeLink>)).toBe('<span class="text-muted">x</span>');
  });
});

describe('26.13 fix 3: a URL from parseLinks must pass safeHref before window.open', () => {
  it('an unsafe first link yields no href, so no popup button', () => {
    const first = parseLinks('[docs](javascript:alert(1))')[0];
    expect(first?.kind === 'link' ? safeHref(first.url, BASE) : 'n/a').toBeUndefined();
  });
});

describe('parseLinks (26.05)', () => {
  it('splits text and [label](url) links, without judging the URL', () => {
    expect(parseLinks('See [spec](https://x.test/s) and [bad](javascript:alert(1)).')).toEqual([
      { kind: 'text', text: 'See ' },
      { kind: 'link', label: 'spec', url: 'https://x.test/s' },
      { kind: 'text', text: ' and ' },
      { kind: 'link', label: 'bad', url: 'javascript:alert(1' },
      { kind: 'text', text: ').' },
    ]);
  });
});

describe('sanitizeHtml (26.04)', () => {
  it('keeps the allowed formatting', () => {
    expect(sanitizeHtml('<b>bold</b> <em>it</em><ul><li>x</li></ul>')).toBe('<b>bold</b> <em>it</em><ul><li>x</li></ul>');
  });

  it('removes scripts, event handlers, styles and unknown tags', () => {
    expect(sanitizeHtml('<img src=x onerror="alert(1)">hi')).toBe('hi');
    expect(sanitizeHtml('<script>alert(1)</script>ok')).toBe('ok');
    expect(sanitizeHtml('<b onclick="alert(1)" style="color:red">x</b>')).toBe('<b>x</b>');
    expect(sanitizeHtml('<svg><a href="javascript:alert(1)">x</a></svg>')).toBe('');
  });

  it('links: dangerous URLs dropped; safe ones forced to open safely', () => {
    expect(sanitizeHtml('<a href="javascript:alert(1)">x</a>')).toBe('<a target="_blank" rel="noopener noreferrer">x</a>');
    expect(sanitizeHtml('<a href="https://ok.test" target="_self">x</a>')).toBe(
      '<a href="https://ok.test" target="_blank" rel="noopener noreferrer">x</a>',
    );
  });
});

describe('what React 19 does by itself (26.02)', () => {
  it('escapes text children and attribute values', () => {
    expect(renderToStaticMarkup(<p title={'"><script>'}>{'<img src=x onerror=alert(1)>'}</p>)).toBe(
      '<p title="&quot;&gt;&lt;script&gt;">&lt;img src=x onerror=alert(1)&gt;</p>',
    );
  });

  it('replaces a javascript: href with a URL that throws, but lets data: through', () => {
    const blocked = renderToStaticMarkup(<a href="javascript:alert(1)">x</a>);
    expect(blocked).not.toContain('alert(1)');
    expect(blocked).toContain('javascript:throw');
    expect(renderToStaticMarkup(<a href="data:text/html,hi">x</a>)).toContain('href="data:text/html,hi"');
  });

  it('dangerouslySetInnerHTML inserts the string unchanged', () => {
    expect(renderToStaticMarkup(<div dangerouslySetInnerHTML={{ __html: '<img src=x onerror=alert(1)>' }} />)).toBe(
      '<div><img src=x onerror=alert(1)></div>',
    );
  });
});
