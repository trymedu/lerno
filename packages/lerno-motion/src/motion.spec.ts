import { describe, expect, it } from 'bun:test';
import { Easings, Property, v2 } from '@medu/lerno';
import { keyframesNumber, keyframesVector2 } from './keyframes';
import { Sequence, Oscillator, stagger } from './sequence';
import { springNumber, springVector2, stepSpring } from './spring';

describe('Spring', () => {
  it('converges to the target and stops', () => {
    const property = new Property(0);
    const spring = springNumber(property, 100, { stiffness: 170, damping: 26, mass: 1 });
    for (let index = 0; index < 600 && !spring.isFinished; index += 1) spring.step(1 / 60);
    expect(spring.isFinished).toBe(true);
    expect(property.get()).toBeCloseTo(100, 3);
  });

  it('an underdamped spring oscillates', () => {
    const state = stepSpring({ value: 0, velocity: 0 }, 10, 1 / 60, { stiffness: 200, damping: 0 });
    expect(state.value).toBeGreaterThan(0);
    expect(state.velocity).toBeGreaterThan(0);
  });

  it('vector spring', () => {
    const property = new Property(v2(0, 0));
    const spring = springVector2(property, v2(50, -25));
    for (let index = 0; index < 900 && !spring.isFinished; index += 1) spring.step(1 / 60);
    expect(property.get().x).toBeCloseTo(50, 2);
    expect(property.get().y).toBeCloseTo(-25, 2);
  });
});

describe('Keyframes', () => {
  it('interpolates between stops', () => {
    const property = new Property(0);
    const animation = keyframesNumber(property, [0, 100, 50], { duration: 1 });
    animation.step(0.5);
    expect(property.get()).toBeCloseTo(100, 3);
    animation.step(0.5);
    expect(property.get()).toBeCloseTo(50, 3);
    expect(animation.isFinished).toBe(true);
  });

  it('timestamped stops', () => {
    const property = new Property(0);
    const animation = keyframesNumber(property, [0, 10, 100], { duration: 1, times: [0, 0.8, 1], easing: Easings.linear });
    animation.step(0.4);
    expect(property.get()).toBeCloseTo(5, 2);
  });

  it('vector keyframe', () => {
    const property = new Property(v2(0, 0));
    const animation = keyframesVector2(property, [v2(0, 0), v2(10, 10)], { duration: 1 });
    animation.step(0.5);
    expect(property.get().x).toBeCloseTo(5, 2);
  });

  it('a single-stop keyframe throws', () => {
    expect(() => keyframesNumber(new Property(0), [1])).toThrow(RangeError);
  });
});

describe('Sequence and stagger', () => {
  it('runs animations in sequence', () => {
    const property = new Property(0);
    const first = keyframesNumber(property, [0, 10], { duration: 1 });
    const second = keyframesNumber(property, [10, 20], { duration: 1 });
    const seq = new Sequence([first, second]);
    seq.step(1);
    expect(seq.currentIndex).toBe(1);
    seq.step(1);
    expect(seq.isFinished).toBe(true);
  });

  it('stagger delays', () => {
    expect(stagger(3, 0.1)).toEqual([0, 0.1, 0.2]);
  });

  it('the oscillator keeps oscillating', () => {
    const property = new Property(0);
    const oscillator = new Oscillator(property, -1, 1, 1);
    oscillator.step(0.25);
    expect(property.get()).toBeCloseTo(1, 3);
    oscillator.step(0.25);
    expect(property.get()).toBeCloseTo(0, 3);
  });
});
