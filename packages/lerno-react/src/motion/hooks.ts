'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Property, animateNumber, type Steppable, type TweenOptions } from '@medu/lerno';
import { springNumber, stepSpring, type SpringOptions } from '@medu/lerno-motion';

/**
 * Creates a property owned by the component's lifetime.
 * The property is disposed on unmount, so listeners registered through useProperty
 * never leak between renders.
 * @param initial - Value the property starts with.
 * @returns A reactive value the scene and the controls can share.
 */
export function useMotionValue<T>(initial: T): Property<T> {
  const [property] = useState(() => new Property(initial));
  useEffect(() => () => property.dispose(), [property]);
  return property;
}

/** Result of `UseAnimate`. */
export interface UseAnimateResult {
  animate: (property: Property<number>, to: number, options?: TweenOptions & { spring?: boolean }) => void;
}

/**
 * Runs animations inside a single requestAnimationFrame loop.
 * The API mirrors animate from Motion so an animation can be declared in one line.
 */
export function useAnimate(): UseAnimateResult {
  const items = useRef<Set<Steppable>>(new Set());

  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      for (const item of [...items.current]) {
        if (!item.step(dt)) items.current.delete(item);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  const animate = useCallback(
    (property: Property<number>, to: number, options: (TweenOptions & { spring?: boolean }) | SpringOptions = {}) => {
      const spring = (options as { spring?: boolean }).spring ?? false;
      const animation = spring
        ? springNumber(property, to, options as SpringOptions)
        : animateNumber(property, to, options as TweenOptions);
      items.current.add(animation);
    },
    [],
  );

  return { animate };
}

/**
 * Produces a value that converges on a source using spring physics.
 * The hook mirrors useSpring from Motion; the source may be a number or a property.
 */
export function useSpring(source: number | Property<number>, options: SpringOptions = {}): Property<number> {
  const sourceProperty = useMemo(() => (typeof source === 'number' ? new Property(source) : source), [source]);
  const [value] = useState(() => new Property(sourceProperty.get()));

  useEffect(() => {
    if (typeof source === 'number') sourceProperty.set(source);
  }, [source, sourceProperty]);

  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    let state = { value: value.get(), velocity: 0 };

    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      state = stepSpring(state, sourceProperty.get(), dt, options);
      value.set(state.value);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [sourceProperty, value, options]);

  useEffect(() => () => value.dispose(), [value]);

  return value;
}

/**
 * Runs a callback on every animation frame while the component is mounted.
 * The delta is capped so a background tab cannot jump the simulation forward.
 * @param callback - Receives elapsed time in seconds for each frame.
 * @param running - When false, the loop is suspended without unmounting.
 */
export function useAnimationFrame(callback: (dtSeconds: number) => void, running = true): void {
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  useEffect(() => {
    if (!running) return undefined;
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      callbackRef.current(dt);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [running]);
}
