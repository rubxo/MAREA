import { LruIndex } from './lru-index';

describe('LruIndex', () => {
  it('promotes reads and evicts the least recently used value', () => {
    const cache = new LruIndex<string, string>(3);
    cache.set('a', 'A', 1);
    cache.set('b', 'B', 1);
    cache.set('c', 'C', 1);

    expect(cache.get('a')).toBe('A');
    expect(cache.set('d', 'D', 1)).toEqual([{ key: 'b', value: 'B', cost: 1 }]);
    expect(cache.has('a')).toBe(true);
    expect(cache.has('b')).toBe(false);
  });

  it('evicts by total cost and replaces an existing key without double counting', () => {
    const cache = new LruIndex<string, string>(5);
    cache.set('hero', 'small', 2);
    cache.set('thumb', 'thumb', 2);

    expect(cache.set('hero', 'large', 4)).toEqual([{ key: 'thumb', value: 'thumb', cost: 2 }]);
    expect(cache.cost).toBe(4);
    expect(cache.get('hero')).toBe('large');
  });

  it('does not retain an entry larger than the entire budget', () => {
    const cache = new LruIndex<string, string>(2);
    expect(cache.set('huge', 'H', 3)).toEqual([{ key: 'huge', value: 'H', cost: 3 }]);
    expect(cache.size).toBe(0);
    expect(cache.cost).toBe(0);
  });
});

