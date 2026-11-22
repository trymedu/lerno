'use client';

import { useEffect, useMemo, useState, type PointerEvent as ReactPointerEvent } from 'react';
import type { Node } from '@medu/lerno';
import { Display } from '../scenery/Display.js';

/** A scene the player can drive: a root to draw and a deterministic step. */
export interface PlayableScene {
  root: Node;
  step(dtSeconds: number): void;
}

/** Geometry and timing for a scene, matching the exporter's options. */
export interface ScenePlayerMeta {
  width: number;
  height: number;
  fps: number;
  duration: number;
  background?: string;
}

/** Accessible strings; override them to localise the controls. */
export interface ScenePlayerLabels {
  play: string;
  pause: string;
  restart: string;
  seek: string;
}

/** Props of {@link ScenePlayer}. */
export interface ScenePlayerProps {
  /** Builds a fresh scene; called again whenever the playhead moves backwards. */
  createScene: () => PlayableScene;
  /** Geometry and timing of the scene. */
  meta: ScenePlayerMeta;
  /** Storyboard moments, drawn as ticks on the track. */
  beats?: readonly number[];
  /** Accessible name for the drawing. */
  title: string;
  /** Chrome tone; `light` is meant for paper backgrounds. */
  tone?: 'light' | 'dark';
  labels?: Partial<ScenePlayerLabels>;
  className?: string;
}

const DEFAULT_LABELS: ScenePlayerLabels = {
  play: 'Play',
  pause: 'Pause',
  restart: 'Restart',
  seek: 'Seek',
};

function formatTime(seconds: number): string {
  const tenths = Math.round(seconds * 10);
  const whole = Math.floor(tenths / 10);
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, '0')}.${tenths % 10}`;
}

function PlayIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" aria-hidden className={className} fill="currentColor">
      <path d="M4.5 2.8v10.4a.6.6 0 0 0 .92.5l8.1-5.2a.6.6 0 0 0 0-1L5.42 2.3a.6.6 0 0 0-.92.5Z" />
    </svg>
  );
}

function PauseIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" aria-hidden className={className} fill="currentColor">
      <rect x="4" y="2.5" width="3" height="11" rx="0.8" />
      <rect x="9" y="2.5" width="3" height="11" rx="0.8" />
    </svg>
  );
}

function RestartIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" aria-hidden className={className} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
      <path d="M3 8a5 5 0 1 0 1.7-3.8" />
      <path d="M3 2.6V5.4h2.8" />
    </svg>
  );
}

/**
 * Plays a Lerno scene in the browser through {@link Display}.
 *
 * The scene graph is the source of truth: playback advances it with the real
 * frame delta, and a seek replays it from zero with a fixed step, so the
 * preview lands on the same state the exporter would produce. No video file is
 * involved.
 */
export function ScenePlayer({ createScene, meta, beats = [], title, tone = 'dark', labels, className }: ScenePlayerProps) {
  const { duration, fps, width, height, background } = meta;
  const text = { ...DEFAULT_LABELS, ...labels };
  const dark = tone === 'dark';
  const [time, setTime] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [scrubbing, setScrubbing] = useState(false);

  const engine = useMemo(() => {
    let current = createScene();
    let at = 0;
    return {
      get root() {
        return current.root;
      },
      seek(target: number): number {
        const clamped = Math.max(0, Math.min(duration, target));
        if (clamped < at) {
          current = createScene();
          at = 0;
        }
        const step = 1 / fps;
        while (at + step <= clamped) {
          current.step(step);
          at += step;
        }
        if (clamped - at > 1e-6) {
          current.step(clamped - at);
          at = clamped;
        }
        return at;
      },
      advance(delta: number): number {
        if (at >= duration) return at;
        const next = Math.min(duration, at + delta);
        current.step(next - at);
        at = next;
        return at;
      },
    };
  }, [createScene, duration, fps]);

  useEffect(() => {
    if (!playing) return;
    let frame = 0;
    let last = performance.now();

    const tick = (now: number) => {
      const delta = Math.min(0.1, (now - last) / 1000);
      last = now;
      const next = engine.advance(delta);
      setTime(next);
      if (next >= duration) {
        setPlaying(false);
        return;
      }
      frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [playing, engine, duration]);

  const seekTo = (target: number): void => {
    setTime(engine.seek(target));
  };

  const toggle = (): void => {
    if (playing) {
      setPlaying(false);
      return;
    }
    if (time >= duration) seekTo(0);
    setPlaying(true);
  };

  const restart = (): void => {
    setPlaying(false);
    seekTo(0);
  };

  const scrub = (event: ReactPointerEvent<HTMLDivElement>): void => {
    const rect = event.currentTarget.getBoundingClientRect();
    if (rect.width === 0) return;
    const ratio = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
    seekTo(ratio * duration);
  };

  const progress = duration === 0 ? 0 : time / duration;
  const idle = time === 0 && !playing;
  const chrome = dark ? 'border-white/10 bg-zinc-950 text-zinc-100' : 'border-zinc-200 bg-white text-zinc-900';
  const ghost = dark
    ? 'text-zinc-400 hover:bg-white/10 hover:text-zinc-100'
    : 'text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900';
  const track = dark ? 'bg-white/15' : 'bg-zinc-200';
  const fill = dark ? 'bg-zinc-100' : 'bg-zinc-900';

  return (
    <div className={`overflow-hidden rounded-xl border ${dark ? 'border-white/10' : 'border-zinc-200'} ${className ?? ''}`}>
      <div className="relative">
        <Display node={engine.root} width={width} height={height} backgroundColor={background} title={title} />
        {idle ? (
          <button
            type="button"
            onClick={toggle}
            aria-label={`${text.play}: ${title}`}
            className="absolute inset-0 grid place-items-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-zinc-900/40"
          >
            <span className="grid h-12 w-12 place-items-center rounded-full bg-white/95 text-zinc-900 transition-transform hover:scale-105">
              <PlayIcon className="h-4 w-4" />
            </span>
          </button>
        ) : null}
      </div>

      <div className={`flex items-center gap-3 border-t px-3 py-2.5 ${chrome}`}>
        <button
          type="button"
          onClick={toggle}
          aria-label={playing ? text.pause : text.play}
          className={`grid h-8 w-8 shrink-0 place-items-center rounded-full transition-colors ${
            dark ? 'bg-white/10 hover:bg-white/20' : 'bg-zinc-100 hover:bg-zinc-200'
          }`}
        >
          {playing ? <PauseIcon className="h-3.5 w-3.5" /> : <PlayIcon className="h-3.5 w-3.5" />}
        </button>

        <button
          type="button"
          onClick={restart}
          aria-label={text.restart}
          className={`grid h-8 w-8 shrink-0 place-items-center rounded-full transition-colors ${ghost}`}
        >
          <RestartIcon className="h-4 w-4" />
        </button>

        <div
          role="slider"
          tabIndex={0}
          aria-label={text.seek}
          aria-valuemin={0}
          aria-valuemax={Math.round(duration)}
          aria-valuenow={Math.round(time)}
          aria-valuetext={`${time.toFixed(1)}s`}
          onPointerDown={(event) => {
            event.currentTarget.setPointerCapture(event.pointerId);
            setScrubbing(true);
            scrub(event);
          }}
          onPointerMove={(event) => {
            if (event.currentTarget.hasPointerCapture(event.pointerId)) scrub(event);
          }}
          onPointerUp={(event) => {
            event.currentTarget.releasePointerCapture(event.pointerId);
            setScrubbing(false);
          }}
          onKeyDown={(event) => {
            if (event.key === 'ArrowRight') seekTo(time + 0.5);
            if (event.key === 'ArrowLeft') seekTo(time - 0.5);
            if (event.key === 'Home') seekTo(0);
            if (event.key === 'End') seekTo(duration);
          }}
          className="group relative flex h-6 flex-1 cursor-pointer items-center focus-visible:outline-none"
        >
          <div className={`h-1 w-full rounded-full ${track}`}>
            <div className={`h-1 rounded-full ${fill}`} style={{ width: `${progress * 100}%` }} />
          </div>
          {beats.map((beat) => (
            <span
              key={beat}
              aria-hidden
              className={`absolute top-1/2 h-2 w-px -translate-y-1/2 ${dark ? 'bg-white/30' : 'bg-zinc-400/60'}`}
              style={{ left: `${(beat / duration) * 100}%` }}
            />
          ))}
          <span
            aria-hidden
            className={`absolute top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full transition-opacity ${fill} ${
              scrubbing || playing ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
            }`}
            style={{ left: `${progress * 100}%` }}
          />
        </div>

        <span className={`shrink-0 text-[11px] tabular-nums ${dark ? 'text-zinc-400' : 'text-zinc-500'}`}>
          {formatTime(time)} / {formatTime(duration)}
        </span>
      </div>
    </div>
  );
}
