import type { ReactNode } from 'react';
import { isExternal, safeHref } from './safeUrl';

interface SafeLinkProps {
  /** Untrusted: typed by a user, stored by the server, shown to OTHER users. */
  href: string;
  children: ReactNode;
}

/**
 * S26 (26.06): the only way TaskFlow renders a user-supplied URL.
 * - unsafe protocol → plain text (the user still sees what was written, nothing is clickable);
 * - external → new tab with `rel="noopener noreferrer"`: the other site gets no `window.opener`
 *   (reverse tabnabbing) and no Referer (our URLs may contain ids);
 * - the real target is shown in `title`, so a label like "Google" can't hide where it goes.
 */
export function SafeLink({ href, children }: SafeLinkProps) {
  const safe = safeHref(href);
  if (safe === undefined) return <span className="text-muted">{children}</span>;
  const external = isExternal(safe);
  return (
    <a href={safe} title={safe} {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}>
      {children}
    </a>
  );
}
