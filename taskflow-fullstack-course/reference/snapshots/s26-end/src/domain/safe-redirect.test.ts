import { describe, expect, it } from 'vitest';
import { safeReturnTo } from './safe-redirect';

describe('safeReturnTo', () => {
  it.each([
    [null, '/tasks'],
    ['/tasks/5?status=DONE', '/tasks/5?status=DONE'],
    ['/dashboard', '/dashboard'],
    ['https://evil.example', '/tasks'],
    ['javascript:alert(1)', '/tasks'],
    ['//evil.example', '/tasks'],
    ['/\\evil.example', '/tasks'], // the string is /\evil.example
    ['tasks', '/tasks'],
    ['', '/tasks'],
  ])('safeReturnTo(%j) → %j', (input, expected) => {
    expect(safeReturnTo(input)).toBe(expected);
  });

  it('uses the given fallback', () => {
    expect(safeReturnTo('https://evil.example', '/login')).toBe('/login');
  });
});
