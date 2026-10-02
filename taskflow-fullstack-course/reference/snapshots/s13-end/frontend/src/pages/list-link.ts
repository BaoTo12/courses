/**
 * The list URL to go back to, taken from router location state (set by TaskCard links).
 * location.state is `unknown` (history entries can hold anything and survive reloads):
 * validate it like any other input before use.
 */
export function backToListHref(state: unknown): string {
  if (typeof state === 'object' && state !== null && 'listSearch' in state) {
    const search = state.listSearch;
    if (typeof search === 'string' && (search === '' || search.startsWith('?'))) {
      return `/tasks${search}`;
    }
  }
  return '/tasks';
}

/** Route params are strings (or undefined). A task id must be a positive integer. */
export function parseTaskId(raw: string | undefined): number | null {
  if (raw === undefined || !/^\d+$/.test(raw)) return null;
  const id = Number(raw);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}
