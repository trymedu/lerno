import { describe, expect, it } from 'bun:test';
import { createBrowserHost } from './browserHost';

class MemoryStorage implements Storage {
  private readonly store = new Map<string, string>();

  get length(): number {
    return this.store.size;
  }

  clear(): void {
    this.store.clear();
  }

  getItem(key: string): string | null {
    return this.store.get(key) ?? null;
  }

  key(index: number): string | null {
    return Array.from(this.store.keys())[index] ?? null;
  }

  removeItem(key: string): void {
    this.store.delete(key);
  }

  setItem(key: string, value: string): void {
    this.store.set(key, value);
  }
}

const session = {
  documentId: 'doc',
  schemaVersion: 2,
  cursor: 'clip',
  visited: ['clip'],
  answers: {},
  variables: { airOn: false },
  status: 'in-progress' as const,
};

describe('createBrowserHost', () => {
  it('writes and reads a session back', () => {
    const storage = new MemoryStorage();
    const host = createBrowserHost({ storage });

    host.storage.save('doc', session);
    expect(host.storage.load('doc')).toEqual(session);
  });

  it('ignores a corrupt record', () => {
    const storage = new MemoryStorage();
    storage.setItem('lerno:doc:session', '{not json');
    const host = createBrowserHost({ storage });

    expect(host.storage.load('doc')).toBeUndefined();
  });

  it('ignores an old envelope version', () => {
    const storage = new MemoryStorage();
    storage.setItem('lerno:doc:session', JSON.stringify({ version: 0, session }));
    const host = createBrowserHost({ storage });

    expect(host.storage.load('doc')).toBeUndefined();
  });

  it('stores time under a separate key and clears it', () => {
    const storage = new MemoryStorage();
    const host = createBrowserHost({ storage });

    host.storage.saveTime?.('doc', 4321);
    expect(host.storage.loadTime?.('doc')).toBe(4321);

    host.storage.clear('doc');
    expect(host.storage.loadTime?.('doc')).toBeUndefined();
  });

  it('separates two players by prefix', () => {
    const storage = new MemoryStorage();
    const first = createBrowserHost({ storage, prefix: 'a' });
    const second = createBrowserHost({ storage, prefix: 'b' });

    first.storage.save('doc', session);
    expect(first.storage.load('doc')).toEqual(session);
    expect(second.storage.load('doc')).toBeUndefined();
  });
});
