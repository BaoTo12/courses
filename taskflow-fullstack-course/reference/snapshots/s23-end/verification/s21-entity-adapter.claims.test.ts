// Lecture-claim tests for 21.12 (createEntityAdapter): what each CRUD method does, sortComparer,
// the selectors, and using the methods directly as case reducers. Pinned to the installed RTK.
import { configureStore, createEntityAdapter, createSlice } from '@reduxjs/toolkit';
import { describe, expect, it } from 'vitest';

interface Book {
  id: number;
  title: string;
  year?: number;
}

const adapter = createEntityAdapter<Book>();
const start = adapter.getInitialState({ loading: false }, [{ id: 1, title: 'Dune', year: 1965 }]);

describe('21.12 createEntityAdapter: state and CRUD methods (standalone, outside a slice)', () => {
  it('getInitialState(extra, entities) → { ids, entities, ...extra }', () => {
    expect(start).toEqual({ ids: [1], entities: { 1: { id: 1, title: 'Dune', year: 1965 } }, loading: false });
  });

  it('addOne ignores an EXISTING id; setOne replaces; upsertOne shallow-merges', () => {
    const newer = { id: 1, title: 'Dune (2nd ed.)' };
    expect(adapter.addOne(start, newer).entities[1]).toEqual({ id: 1, title: 'Dune', year: 1965 });
    expect(adapter.setOne(start, newer).entities[1]).toEqual({ id: 1, title: 'Dune (2nd ed.)' }); // year gone
    expect(adapter.upsertOne(start, newer).entities[1]).toEqual({ id: 1, title: 'Dune (2nd ed.)', year: 1965 });
  });

  it('updateOne({ id, changes }) merges; an unknown id is ignored', () => {
    expect(adapter.updateOne(start, { id: 1, changes: { year: 1966 } }).entities[1]?.year).toBe(1966);
    expect(adapter.updateOne(start, { id: 9, changes: { year: 1 } })).toEqual(start);
  });

  it('removeOne / removeMany / removeAll; setAll replaces everything in the given order', () => {
    const three = adapter.setAll(start, [
      { id: 3, title: 'C' },
      { id: 2, title: 'B' },
      { id: 1, title: 'A' },
    ]);
    expect(three.ids).toEqual([3, 2, 1]);
    expect(adapter.removeOne(three, 2).ids).toEqual([3, 1]);
    expect(adapter.removeMany(three, [3, 1]).ids).toEqual([2]);
    expect(adapter.removeAll(three)).toMatchObject({ ids: [], entities: {}, loading: false });
  });

  it('the standalone methods return a NEW state and leave the input untouched (Immer inside)', () => {
    const next = adapter.addOne(start, { id: 2, title: 'Emma' });
    expect(next).not.toBe(start);
    expect(start.ids).toEqual([1]);
  });
});

describe('21.12 sortComparer', () => {
  it('keeps ids sorted on every insert AND update', () => {
    const byTitle = createEntityAdapter<Book>({ sortComparer: (a, b) => a.title.localeCompare(b.title) });
    let state = byTitle.getInitialState();
    state = byTitle.addMany(state, [
      { id: 1, title: 'Walden' },
      { id: 2, title: 'Beloved' },
    ]);
    expect(state.ids).toEqual([2, 1]);
    state = byTitle.updateOne(state, { id: 1, changes: { title: 'Anna Karenina' } });
    expect(state.ids).toEqual([1, 2]);
  });

  it('selectId for entities whose key is not `id`', () => {
    const byIsbn = createEntityAdapter({ selectId: (book: { isbn: string; title: string }) => book.isbn });
    const state = byIsbn.addOne(byIsbn.getInitialState(), { isbn: '978-0', title: 'X' });
    expect(state.ids).toEqual(['978-0']);
  });
});

describe('21.12 selectors and case reducers', () => {
  const booksSlice = createSlice({
    name: 'books',
    initialState: adapter.getInitialState(),
    reducers: {
      bookAdded: adapter.addOne, // an adapter method IS a case reducer: (state, action) uses action.payload
      booksReceived: adapter.setAll,
      bookUpdated: adapter.updateOne,
    },
  });

  it('adapter methods work directly as case reducers', () => {
    const store = configureStore({ reducer: { books: booksSlice.reducer } });
    store.dispatch(booksSlice.actions.booksReceived([{ id: 1, title: 'A' }]));
    store.dispatch(booksSlice.actions.bookAdded({ id: 2, title: 'B' }));
    store.dispatch(booksSlice.actions.bookUpdated({ id: 1, changes: { title: 'A2' } }));
    expect(store.getState().books.ids).toEqual([1, 2]);
    expect(store.getState().books.entities[1]?.title).toBe('A2');
  });

  it('getSelectors(selectState) gives selectIds/selectEntities/selectAll/selectTotal/selectById; selectAll is memoized', () => {
    const store = configureStore({ reducer: { books: booksSlice.reducer } });
    store.dispatch(booksSlice.actions.booksReceived([{ id: 1, title: 'A' }, { id: 2, title: 'B' }]));
    const selectors = adapter.getSelectors((state: ReturnType<typeof store.getState>) => state.books);
    expect(Object.keys(selectors).sort()).toEqual(['selectAll', 'selectById', 'selectEntities', 'selectIds', 'selectTotal']);
    const all = selectors.selectAll(store.getState());
    expect(all.map((b) => b.title)).toEqual(['A', 'B']);
    expect(selectors.selectAll(store.getState())).toBe(all);
    expect(selectors.selectTotal(store.getState())).toBe(2);
    expect(selectors.selectById(store.getState(), 2)?.title).toBe('B');
    const local = adapter.getSelectors(); // unbound: takes the entity state itself
    expect(local.selectTotal(store.getState().books)).toBe(2);
  });
});
