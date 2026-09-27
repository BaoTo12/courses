import { describe, expect, it } from 'vitest';
import { backToListHref, parseCategoryParam, parseTaskId } from './list-link';

describe('parseTaskId', () => {
  it.each([
    ['5', 5],
    ['123', 123],
    [undefined, null],
    ['', null],
    ['abc', null],
    ['-1', null],
    ['0', null],
    ['1e3', null],
    ['5.0', null],
    ['99999999999999999999', null],
  ])('parseTaskId(%j) → %j', (input, expected) => {
    expect(parseTaskId(input)).toBe(expected);
  });
});

describe('backToListHref', () => {
  it('returns the remembered list URL', () => {
    expect(backToListHref({ listSearch: '?status=DONE&q=report' })).toBe('/tasks?status=DONE&q=report');
    expect(backToListHref({ listSearch: '' })).toBe('/tasks');
  });

  it.each([null, undefined, 'x', 42, {}, { listSearch: 5 }, { listSearch: '//evil.example' }, { listSearch: 'https://evil.example' }])(
    'falls back to /tasks for untrusted state %j',
    (state) => {
      expect(backToListHref(state)).toBe('/tasks');
    },
  );
});

describe('parseCategoryParam (19.11)', () => {
  it.each([
    ['4', 4],
    [null, null],
    ['', null],
    ['abc', null],
    ['-1', null],
    ['0', null],
    ['2.5', null],
  ])('parseCategoryParam(%j) → %j', (input, expected) => {
    expect(parseCategoryParam(input)).toBe(expected);
  });
});
