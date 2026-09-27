// @vitest-environment jsdom
// S50 (50.09 red team): the one planted vulnerability the suite did NOT catch was comment HTML rendered without
// DOMPurify (`dangerouslySetInnerHTML={{ __html: comment.body }}`). This test closes that gap: with "Show formatting"
// on, a hostile comment keeps its harmless markup and loses every script-capable part.
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import { describe, expect, it } from 'vitest';
import { makeStore } from '../../app/store';
import { AuthContext, type AuthContextValue } from '../../auth/auth-context';
import { commentsApi } from './commentsApi';
import { CommentsSection } from './CommentsSection';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const HOSTILE =
  '<b>bold</b><img src=x onerror="window.pwned=1"><a href="javascript:alert(1)">link</a><script>window.pwned=2</script>';

const anonymous: AuthContextValue = {
  user: null,
  isChecking: false,
  login: () => Promise.reject(new Error('not in this test')),
  logout: () => Promise.resolve(),
};

describe('CommentsSection with formatting on (S50)', () => {
  it('renders the harmless markup and nothing that can run script', async () => {
    const store = makeStore();
    await store.dispatch(                                   // an async thunk: the cache entry exists once it resolves
      commentsApi.util.upsertQueryData('getComments', 5, [
        { id: 1, taskId: 5, authorId: 2, body: HOSTILE, createdAt: '2026-09-26T08:00:00Z' },
      ]),
    );
    const container = document.createElement('div');
    document.body.append(container);
    await act(async () => {
      createRoot(container).render(
        <Provider store={store}>
          <AuthContext.Provider value={anonymous}>
            <CommentsSection taskId={5} />
          </AuthContext.Provider>
        </Provider>,
      );
    });
    const toggle = container.querySelector<HTMLInputElement>('input[type="checkbox"]');
    expect(toggle).not.toBeNull();
    await act(async () => {
      toggle?.click();
    });

    expect(container.querySelector('b')?.textContent).toBe('bold');            // formatting is really on
    expect(container.querySelector('script')).toBeNull();
    expect(container.querySelector('[onerror]')).toBeNull();
    expect(container.querySelector('a[href^="javascript:"]')).toBeNull();
    expect((window as { pwned?: number }).pwned).toBeUndefined();
  });
});
