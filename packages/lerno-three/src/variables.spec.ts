import { describe, expect, it } from 'bun:test';
import { VariableStore } from './variables';

describe('VariableStore', () => {
  it('defines and updates variables', () => {
    const store = new VariableStore();
    const speed = store.defineNumber('speed', 3);
    expect(store.value('speed')).toBe(3);
    speed.set(5);
    expect(store.number('speed')).toBe(5);
    store.set('speed', 8);
    expect(store.number('speed')).toBe(8);
    expect(store.has('speed')).toBe(true);
    expect(store.names()).toEqual(['speed']);
  });

  it('snapshot and restore', () => {
    const store = new VariableStore();
    store.define('a', 1);
    store.define('b', 2);
    const snapshot = store.snapshot();
    store.set('a', 99);
    store.restore(snapshot);
    expect(store.value('a')).toBe(1);
    expect(snapshot).toEqual({ a: 1, b: 2 });
  });

  it('derived variable', () => {
    const store = new VariableStore();
    store.define('a', 2);
    store.define('b', 3);
    const sum = store.derive('sum', ['a', 'b'], ([a, b]) => Number(a) + Number(b));
    expect(sum.get()).toBe(5);
    store.set('a', 10);
    expect(sum.get()).toBe(13);
  });
});
