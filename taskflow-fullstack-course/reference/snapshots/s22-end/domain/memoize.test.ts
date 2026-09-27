import { describe, expect, it, vi } from 'vitest';
import { memoize, memoizeOne } from './memoize';

describe('memoizeOne (21.01)', () => {
  it('calls fn again only when an argument changes (by reference)', () => {
    const fn = vi.fn((list: readonly number[], min: number) => list.filter((n) => n >= min));
    const cached = memoizeOne(fn);
    const list = [1, 5, 9];

    const first = cached(list, 5);
    expect(cached(list, 5)).toBe(first); // same arguments → the SAME array, fn not called
    expect(fn).toHaveBeenCalledTimes(1);

    cached([1, 5, 9], 5); // equal CONTENT, new reference → a miss
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('forgets everything but the last call: alternating arguments always miss', () => {
    const fn = vi.fn((n: number) => n * 2);
    const cached = memoizeOne(fn);
    for (const n of [1, 2, 1, 2]) cached(n);
    expect(fn).toHaveBeenCalledTimes(4);
  });
});

describe('memoize (21.01)', () => {
  it('remembers every argument list: alternating arguments hit after the first round', () => {
    const fn = vi.fn((n: number) => n * 2);
    const cached = memoize(fn);
    for (const n of [1, 2, 1, 2]) cached(n);
    expect(fn).toHaveBeenCalledTimes(2);
    expect(cached.cacheSize()).toBe(2);
  });

  it('grows without bound for many distinct arguments (the price of "remember everything")', () => {
    const cached = memoize((text: string) => text.toUpperCase());
    for (let i = 0; i < 1000; i++) cached(`query ${i}`);
    expect(cached.cacheSize()).toBe(1000);
    cached.clear();
    expect(cached.cacheSize()).toBe(0);
  });
});
