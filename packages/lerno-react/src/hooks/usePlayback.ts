'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

/** Options accepted by `UsePlayback`. */
export interface UsePlaybackOptions {
  /** Total animation duration in ms. */
  duration?: number;
  /** Loops back to the start at the end. */
  loop?: boolean;
}

/** Shape of `Playback`. */
export interface Playback {
  /** Progress from 0.0 to 1.0. */
  progress: number;
  playing: boolean;
  play: () => void;
  pause: () => void;
  reset: () => void;
}

/**
 * Deterministic timeline built on requestAnimationFrame.
 * It provides interactive playback in the browser without depending on Remotion,
 * and the same progress value can drive canvas, SVG, or video export.
 */
export function usePlayback(options: UsePlaybackOptions = {}): Playback {
  const { duration = 1500, loop = false } = options;
  const [progress, setProgress] = useState(1);
  const [playing, setPlaying] = useState(false);
  const frameRef = useRef<number | null>(null);
  const startRef = useRef(0);

  const stop = useCallback(() => {
    if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    frameRef.current = null;
    setPlaying(false);
  }, []);

  const play = useCallback(() => {
    stop();
    setProgress(0);
    setPlaying(true);
    startRef.current = performance.now();

    const tick = (now: number) => {
      const elapsed = now - startRef.current;
      const next = Math.min(1, elapsed / duration);
      setProgress(next);

      if (next < 1) {
        frameRef.current = requestAnimationFrame(tick);
      } else if (loop) {
        startRef.current = now;
        frameRef.current = requestAnimationFrame(tick);
      } else {
        frameRef.current = null;
        setPlaying(false);
      }
    };

    frameRef.current = requestAnimationFrame(tick);
  }, [duration, loop, stop]);

  const reset = useCallback(() => {
    stop();
    setProgress(1);
  }, [stop]);

  useEffect(() => stop, [stop]);

  return { progress, playing, play, pause: stop, reset };
}
