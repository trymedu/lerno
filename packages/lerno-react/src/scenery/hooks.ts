'use client';

import { useEffect, useState } from 'react';
import type { Property, Sim } from '@medu/lerno';

/**
 * Subscribes React to a `Property` and returns its current value.
 *
 * The value is read once on mount, then refreshed by the property's own
 * listener, so the component re-renders only when the property changes.
 *
 * @param property - Property to observe.
 * @returns The current value of the property.
 */
export function useProperty<T>(property: Property<T>): T {
  const [value, setValue] = useState<T>(() => property.get());
  useEffect(() => property.link(setValue), [property]);
  return value;
}

/** Options controlling how a simulation is stepped by {@link useSimStep}. */
export interface UseSimStepOptions {
  /** When `false`, the loop is suspended and the component stops re-rendering. Defaults to `true`. */
  running?: boolean;
  /** Upper bound on the step length in seconds, so a background tab cannot jump ahead. Defaults to `0.05`. */
  maxDelta?: number;
}

/**
 * Advances a `Sim` inside a `requestAnimationFrame` loop.
 *
 * The loop is capped by `maxDelta`, so a tab that resumes after a long pause
 * does not integrate a large gap. The frame number returned by the clock is
 * used as the re-render key, so React repaints once per frame.
 *
 * @param sim - Simulation to advance.
 * @param options - Toggle and maximum step length.
 * @returns The current frame count of the simulation clock.
 */
export function useSimStep(sim: Sim, options: UseSimStepOptions = {}): number {
  const { running = true, maxDelta = 0.05 } = options;
  const [frame, setFrame] = useState(() => sim.clock.frame);

  useEffect(() => {
    if (!running) return undefined;
    let raf = 0;
    let last = performance.now();

    const tick = (now: number) => {
      const dt = Math.min(maxDelta, (now - last) / 1000);
      last = now;
      sim.step(dt);
      setFrame(sim.clock.frame);
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [sim, running, maxDelta]);

  return frame;
}
