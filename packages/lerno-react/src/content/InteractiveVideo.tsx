'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Button, Chip, Label } from '@heroui/react';
import {
  crossedAnchors,
  type GradeOutcome,
  type LessonStage,
  type MediaAnchor,
  type MediaNode,
  type VariableValue,
} from '@medu/lerno';
import type { LernoComponentMap, LayerTone } from '../components/component-types.js';
import type { VariableMap } from '../components/interactions.js';
import { componentVersionErrors, createComponentMap, missingComponentTypes } from '../components/registry.js';
import { OverlayLayer } from '../components/OverlayLayer.js';
import { QuestionView } from './QuestionView.js';
import { useMediaClock } from './useMediaClock.js';

import { sceneColors } from '../theme.js';

/** Props accepted by `InteractiveVideo`. */
export interface InteractiveVideoProps {
  node: MediaNode;
  src: string;
  answerFor: (anchorId: string) => GradeOutcome | undefined;
  onAnswer: (anchorId: string, response: unknown) => void;
  /** Variables that feed video layers. */
  variables?: VariableMap;
  /** Layer components write their bound variable here. */
  onVariableChange?: (variable: string, value: VariableValue) => void;
  /** Application components; the built-in set is used when omitted. */
  components?: LernoComponentMap;
  /** Registered component versions, compared with `manifest`. */
  componentVersions?: Record<string, number>;
  /** Document manifest; missing or mismatched components are reported above the video. */
  manifest?: readonly { type: string; version: number }[];
  /** Light layer surface for dark footage. */
  tone?: LayerTone;
  /** Poster shown before the video plays. */
  poster?: string;
  /** When provided, video time drives this stage and the layers read it. */
  stage?: LessonStage;
}

const SPEEDS = [0.5, 1, 1.5, 2];

/**
 * Formats a duration for the anchor chips.
 * @param ms - Duration in milliseconds.
 * @returns A minutes and seconds label such as 0:07.
 */
function formatTime(ms: number): string {
  const total = Math.floor(ms / 1000);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}

/** Matches the same breakpoint the inline/overlay decision used to take in CSS. */
function useDesktop(): boolean {
  const [desktop, setDesktop] = useState(true);
  useEffect(() => {
    const query = window.matchMedia('(min-width: 768px)');
    const update = (): void => setDesktop(query.matches);
    update();
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);
  return desktop;
}

/**
 * Interactive video that pauses when the playhead reaches an anchor.
 * A question anchor waits for an answer; an informational anchor waits for the
 * learner to continue.
 *
 * When a stage is passed, the video is the clock: its time is written into the
 * stage, and layers, answers, and scoring all read that single source.
 */
export function InteractiveVideo({
  node,
  src,
  answerFor,
  onAnswer,
  variables,
  onVariableChange,
  components,
  componentVersions,
  manifest,
  tone,
  poster,
  stage,
}: InteractiveVideoProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const shellRef = useRef<HTMLDivElement | null>(null);
  const lastTimeRef = useRef(0);
  const [active, setActive] = useState<MediaAnchor | null>(null);
  const [seen, setSeen] = useState<string[]>([]);
  const [durationMs, setDurationMs] = useState(0);
  const [ownTime, setOwnTime] = useState(0);
  const [buffering, setBuffering] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rate, setRate] = useState(1);
  const desktop = useDesktop();
  const stageTime = useMediaClock(stage, videoRef);
  const currentMs = stageTime ?? ownTime;
  const layerComponents = useMemo(() => components ?? createComponentMap(), [components]);
  const layerVariables = variables ?? {};

  const issues = useMemo(() => {
    if (!manifest || manifest.length === 0) return [];
    return [
      ...missingComponentTypes({ components: manifest }, layerComponents).map((type) => `Component not registered: ${type}`),
      ...componentVersionErrors({ components: manifest }, componentVersions),
    ];
  }, [manifest, layerComponents, componentVersions]);

  useEffect(() => {
    lastTimeRef.current = 0;
    setActive(null);
    setSeen([]);
    setOwnTime(0);
  }, [node.id]);

  useEffect(() => {
    const video = videoRef.current;
    if (video) video.playbackRate = rate;
  }, [rate]);

  function handleTimeUpdate(): void {
    const video = videoRef.current;
    if (!video) return;
    const now = video.currentTime * 1000;
    if (!stage) setOwnTime(now);
    if (active) return;

    const crossed = crossedAnchors(node.anchors, lastTimeRef.current, now);
    lastTimeRef.current = now;
    const next = crossed.find((anchor) => !seen.includes(anchor.id));
    if (next) {
      video.pause();
      setSeen((current) => [...current, next.id]);
      setActive(next);
    }
  }

  function resume(): void {
    setActive(null);
    void videoRef.current?.play();
  }

  /** Jump to an anchor; the time update crosses it and pauses. */
  function jumpTo(anchor: MediaAnchor): void {
    const video = videoRef.current;
    if (!video) return;
    const target = Math.max(0, anchor.atMs - 60) / 1000;
    lastTimeRef.current = Math.max(0, anchor.atMs - 60);
    video.currentTime = target;
    stage?.seek(target * 1000);
    setActive(null);
    setSeen((current) => current.filter((id) => id !== anchor.id));
    void video.play();
  }

  function togglePlayback(): void {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) void video.play();
    else video.pause();
  }

  function seekBy(deltaSeconds: number): void {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = Math.max(0, Math.min(video.duration || 0, video.currentTime + deltaSeconds));
    stage?.seek(video.currentTime * 1000);
  }

  function toggleFullscreen(): void {
    const shell = shellRef.current;
    if (!shell) return;
    if (document.fullscreenElement) void document.exitFullscreen();
    else void shell.requestFullscreen?.();
  }

  return (
    <div className="flex flex-col gap-3">
      {issues.length > 0 ? (
        <div role="status" className="rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900">
          {issues.join(' · ')}
        </div>
      ) : null}

      <div
        ref={shellRef}
        tabIndex={0}
        onKeyDown={(event) => {
          const tag = (event.target as HTMLElement).tagName;
          if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || tag === 'BUTTON') return;
          if (event.key === ' ') {
            event.preventDefault();
            togglePlayback();
          } else if (event.key === 'ArrowLeft') {
            event.preventDefault();
            seekBy(-5);
          } else if (event.key === 'ArrowRight') {
            event.preventDefault();
            seekBy(5);
          } else if (event.key === 'f' || event.key === 'F') {
            toggleFullscreen();
          }
        }}
        className="relative rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400"
      >
        <div className="relative">
          <video
            ref={videoRef}
            src={src}
            poster={poster}
            controls
            playsInline
            onTimeUpdate={handleTimeUpdate}
            onLoadedMetadata={(event) => {
              setDurationMs(event.currentTarget.duration * 1000);
              event.currentTarget.playbackRate = rate;
            }}
            onWaiting={() => setBuffering(true)}
            onPlaying={() => setBuffering(false)}
            onCanPlay={() => setBuffering(false)}
            onError={() => setError('The video could not load. Check the URL or file path.')}
            className="w-full rounded-2xl bg-black"
          >
            {node.captions.map((track) => (
              <track
                key={track.src}
                kind="captions"
                src={track.src}
                srcLang={track.lang}
                label={track.label}
                default={track.default}
              />
            ))}
          </video>

          {desktop && node.layers.length > 0 ? (
            <OverlayLayer
              layers={node.layers}
              currentMs={currentMs}
              variables={layerVariables}
              components={layerComponents}
              onVariableChange={onVariableChange}
              tone={tone}
              mode="overlay"
            />
          ) : null}

          {buffering ? (
            <div className="pointer-events-none absolute inset-x-0 top-3 flex justify-center">
              <span className="rounded-full bg-black/70 px-3 py-1 text-xs text-white">Yükleniyor…</span>
            </div>
          ) : null}

          {error ? (
            <div className="absolute inset-0 grid place-items-center rounded-2xl bg-black/80 p-6 text-center">
              <p className="max-w-sm text-sm text-white">{error}</p>
            </div>
          ) : null}

          {node.anchors.length > 0 && durationMs > 0 ? (
            <div className="pointer-events-none absolute inset-x-2 bottom-11 h-1 rounded-full bg-white/20">
              {node.anchors.map((anchor) => (
                <span
                  key={anchor.id}
                  className="absolute top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white"
                  style={{
                    left: `${(anchor.atMs / durationMs) * 100}%`,
                    backgroundColor: seen.includes(anchor.id) ? sceneColors.success : sceneColors.accent,
                  }}
                />
              ))}
            </div>
          ) : null}
        </div>

        {!desktop && node.layers.length > 0 ? (
          <div className="mt-2 rounded-xl border border-zinc-200 bg-white p-2.5">
            <OverlayLayer
              layers={node.layers}
              currentMs={currentMs}
              variables={layerVariables}
              components={layerComponents}
              onVariableChange={onVariableChange}
              tone={tone}
              mode="inline"
            />
          </div>
        ) : null}

        <div className="mt-2 flex flex-wrap items-center gap-2">
          {SPEEDS.map((speed) => (
            <button
              key={speed}
              type="button"
              onClick={() => setRate(speed)}
              aria-pressed={rate === speed}
              className={`rounded-full border px-2.5 py-1 text-xs tabular-nums transition-colors ${
                rate === speed
                  ? 'border-zinc-900 bg-zinc-900 text-white'
                  : 'border-zinc-200 text-zinc-600 hover:bg-zinc-100'
              }`}
            >
              {speed}×
            </button>
          ))}
          <button
            type="button"
            onClick={toggleFullscreen}
            className="rounded-full border border-zinc-200 px-2.5 py-1 text-xs text-zinc-600 transition-colors hover:bg-zinc-100"
          >
            Tam ekran
          </button>
          <span className="text-[11px] text-muted">
            Boşluk oynat · ← → 5 sn · F tam ekran
          </span>
        </div>
      </div>

      {node.anchors.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {node.anchors.map((anchor) => (
            <Button key={anchor.id} size="sm" variant="ghost" onPress={() => jumpTo(anchor)} className="tabular-nums">
              <Chip color={seen.includes(anchor.id) ? 'success' : 'default'} size="sm">
                {formatTime(anchor.atMs)}
              </Chip>
              {anchor.label}
            </Button>
          ))}
        </div>
      ) : null}

      {active ? (
        <div className="flex flex-col gap-3 rounded-2xl border p-4" style={{ borderColor: sceneColors.primary }}>
          <div className="flex items-center gap-2">
            <Label className="text-sm font-semibold text-foreground">{active.label}</Label>
            <span className="text-xs text-muted tabular-nums">{formatTime(currentMs)}</span>
          </div>
          {active.body ? <span className="text-sm text-muted">{active.body}</span> : null}
          {active.item ? (
            <QuestionView item={active.item} outcome={answerFor(active.id)} onAnswer={(response) => onAnswer(active.id, response)} />
          ) : null}
          <Button variant="primary" onPress={resume}>
            Devam et
          </Button>
        </div>
      ) : null}
    </div>
  );
}
