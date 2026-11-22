import { DerivedProperty, Emitter, Property } from './index';

describe('Property', () => {
  it('notifies listeners when the value changes', () => {
    const property = new Property(1);
    const seen: number[] = [];
    const unlink = property.link((value) => seen.push(value));
    property.set(2);
    property.set(2); // aynı değer → bildirilmez
    property.set(3);
    unlink();

    expect(seen).toEqual([1, 2, 3]);
    expect(property.listenerCount).toBe(0);
  });

  it('reset returns to the initial value', () => {
    const property = new Property('a');
    property.set('b');
    property.reset();
    expect(property.get()).toBe('a');
  });

  it('custom equality function', () => {
    const property = new Property({ x: 1 }, { equals: (a, b) => a.x === b.x });
    let count = 0;
    property.link(() => {
      count += 1;
    });
    property.set({ x: 1 });
    expect(count).toBe(1);
  });
});

describe('DerivedProperty', () => {
  it('recomputes when a dependency changes', () => {
    const mass = new Property(2);
    const acceleration = new Property(3);
    const force = new DerivedProperty([mass, acceleration], ([m, a]) => m * a);
    const seen: number[] = [];
    force.link((value) => seen.push(value));

    mass.set(4);
    acceleration.set(5);

    expect(force.get()).toBe(20);
    expect(seen).toEqual([6, 12, 20]);
  });
});

describe('Emitter', () => {
  it('manages listeners', () => {
    const emitter = new Emitter<[number]>();
    const seen: number[] = [];
    const remove = emitter.addListener((value) => seen.push(value));
    emitter.emit(1);
    remove();
    emitter.emit(2);
    expect(seen).toEqual([1]);
  });
});
