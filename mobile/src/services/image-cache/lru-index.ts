export type LruEntry<K, V> = Readonly<{ key: K; value: V; cost: number }>;

type StoredValue<V> = Readonly<{ value: V; cost: number }>;

export class LruIndex<K, V> {
  private readonly entries = new Map<K, StoredValue<V>>();
  private totalCost = 0;

  constructor(readonly maxCost: number) {
    if (!Number.isFinite(maxCost) || maxCost <= 0) {
      throw new Error('LRU maxCost must be a positive finite number');
    }
  }

  get size(): number {
    return this.entries.size;
  }

  get cost(): number {
    return this.totalCost;
  }

  has(key: K): boolean {
    return this.entries.has(key);
  }

  get(key: K): V | undefined {
    const stored = this.entries.get(key);
    if (!stored) return undefined;
    this.entries.delete(key);
    this.entries.set(key, stored);
    return stored.value;
  }

  set(key: K, value: V, cost: number): readonly LruEntry<K, V>[] {
    if (!Number.isFinite(cost) || cost <= 0) throw new Error('LRU entry cost must be positive');
    if (cost > this.maxCost) return [{ key, value, cost }];

    const previous = this.entries.get(key);
    if (previous) {
      this.entries.delete(key);
      this.totalCost -= previous.cost;
    }

    this.entries.set(key, { value, cost });
    this.totalCost += cost;

    const evicted: LruEntry<K, V>[] = [];
    while (this.totalCost > this.maxCost) {
      const oldest = this.entries.entries().next().value as [K, StoredValue<V>] | undefined;
      if (!oldest) break;
      const [oldestKey, oldestValue] = oldest;
      this.entries.delete(oldestKey);
      this.totalCost -= oldestValue.cost;
      evicted.push({ key: oldestKey, value: oldestValue.value, cost: oldestValue.cost });
    }
    return evicted;
  }

  delete(key: K): boolean {
    const stored = this.entries.get(key);
    if (!stored) return false;
    this.entries.delete(key);
    this.totalCost -= stored.cost;
    return true;
  }

  clear(): void {
    this.entries.clear();
    this.totalCost = 0;
  }
}

