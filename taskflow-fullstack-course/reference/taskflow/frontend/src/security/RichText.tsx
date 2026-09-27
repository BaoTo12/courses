import { useMemo } from 'react';
import { SafeLink } from './SafeLink';
import { parseLinks, sanitizeHtml } from './markup';

/** Plain text with `[label](url)` links (26.05): React renders every piece; no HTML is ever parsed. */
export function LinkifiedText({ text }: { text: string }) {
  const segments = useMemo(() => parseLinks(text), [text]);
  return (
    <>
      {segments.map((segment, index) =>
        segment.kind === 'text' ? (
          segment.text
        ) : (
          <SafeLink key={index} href={segment.url}>
            {segment.label}
          </SafeLink>
        ),
      )}
    </>
  );
}

/**
 * User HTML, sanitised (26.04). The ONLY `dangerouslySetInnerHTML` in TaskFlow, and its input is always the
 * direct output of `sanitizeHtml`. Grep for the prop name in review: every hit must look like this one.
 */
export function SanitizedHtml({ html, className }: { html: string; className?: string }) {
  const clean = useMemo(() => sanitizeHtml(html), [html]);
  return <div className={className} dangerouslySetInnerHTML={{ __html: clean }} />;
}
