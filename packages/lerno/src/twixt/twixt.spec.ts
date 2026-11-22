import { Property } from '../axon';
import { v2 } from '../dot';
import { DragListener } from '../scenery';
import { Easings, AnimationTimeline, Tween, animateNumber, animateVector2 } from './tween';

describe('Tween', () => {
  it('interpolates over the duration', () => {
    const tween = new Tween(0, 10, { duration: 2, easing: Easings.linear });
    expect(tween.value).toBe(0);
    tween.step(1);
    expect(tween.value).toBeCloseTo(5, 6);
    expect(tween.step(1)).toBe(false);
    expect(tween.value).toBeCloseTo(10, 6);
    expect(tween.isFinished).toBe(true);
  });

  it('applies a delay', () => {
    const tween = new Tween(0, 1, { duration: 1, delay: 1, easing: Easings.linear });
    tween.step(0.5);
    expect(tween.value).toBe(0);
    tween.step(1);
    expect(tween.value).toBeCloseTo(0.5, 6);
  });
});

describe('PropertyAnimation', () => {
  it('animates a numeric property', () => {
    const property = new Property(0);
    const animation = animateNumber(property, 100, { duration: 1, easing: Easings.linear });
    animation.step(0.5);
    expect(property.get()).toBeCloseTo(50, 6);
    animation.step(0.5);
    expect(property.get()).toBeCloseTo(100, 6);
  });

  it('animates a vector property', () => {
    const property = new Property(v2(0, 0));
    const animation = animateVector2(property, v2(10, 20), { duration: 2, easing: Easings.linear });
    animation.step(1);
    expect(property.get().toArray()).toEqual([5, 10]);
  });
});

describe('AnimationTimeline', () => {
  it('removes finished animations', () => {
    const timeline = new AnimationTimeline();
    timeline.add(new Tween(0, 1, { duration: 1 }));
    timeline.add(new Tween(0, 1, { duration: 2 }));
    timeline.step(1);
    expect(timeline.isFinished).toBe(false);
    timeline.step(1);
    expect(timeline.isFinished).toBe(true);
  });
});

describe('DragListener', () => {
  it('reports the drag delta', () => {
    const deltas: number[] = [];
    const listener = new DragListener({ drag: (pointer) => deltas.push(pointer.delta?.x ?? 0) });
    listener.down({ x: 0, y: 0 });
    listener.move({ x: 5, y: 0 });
    listener.move({ x: 12, y: 0 });
    listener.up({ x: 12, y: 0 });
    expect(deltas).toEqual([5, 7]);
    expect(listener.isDragging).toBe(false);
  });
});
