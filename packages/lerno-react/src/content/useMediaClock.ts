'use client';

import { useEffect, useRef, useState, type RefObject } from 'react';
import type { LessonStage } from '@medu/lerno';

/**
 * Binds a media element to a lesson stage so both share one clock.
 *
 * The video is the time source while it plays: every animation frame writes
 * `currentTime` into the stage, and the layers read stage time. A seek made on
 * the stage moves the video, with a threshold that stops the two from echoing
 * each other.
 *
 * @param stage - Stage to drive; when omitted, nothing is bound.
 * @param videoRef - Video element that owns playback.
 * @returns The stage playhead in milliseconds, or `undefined` without a stage.
 */
export function useMediaClock(stage: LessonStage | undefined, videoRef: RefObject<HTMLVideoElement | null>): number | undefined {
  const [timeMs, setTimeMs] = useState<number | undefined>(() => stage?.getState().timeMs);
  const applyingRef = useRef(false);
  const pushedRef = useRef(-1);

  useEffect(() => {
    if (!stage) return;
    setTimeMs(stage.getState().timeMs);
    return stage.subscribe((state) => setTimeMs(state.timeMs));
  }, [stage]);

  useEffect(() => {
    const video = videoRef.current;
    if (!stage || !video) return;

    let frame = 0;
    const push = (): void => {
      if (applyingRef.current) return;
      const ms = Math.round(video.currentTime * 1000);
      pushedRef.current = ms;
      stage.seek(ms);
    };
    const loop = (): void => {
      if (!video.paused && !video.ended) push();
      frame = requestAnimationFrame(loop);
    };

    frame = requestAnimationFrame(loop);
    video.addEventListener('timeupdate', push);
    video.addEventListener('seeked', push);
    return () => {
      cancelAnimationFrame(frame);
      video.removeEventListener('timeupdate', push);
      video.removeEventListener('seeked', push);
    };
  }, [stage, videoRef]);

  useEffect(() => {
    const video = videoRef.current;
    if (!stage || !video || timeMs === undefined) return;
    const target = timeMs / 1000;
    // Only external seeks move the video; a frame the media itself pushed is not one.
    if (Math.abs(timeMs - pushedRef.current) <= 16) return;
    if (Math.abs(video.currentTime - target) <= 0.05) return;
    applyingRef.current = true;
    video.currentTime = target;
    const release = (): void => {
      applyingRef.current = false;
    };
    video.addEventListener('seeked', release, { once: true });
    const timer = setTimeout(release, 250);
    return () => {
      clearTimeout(timer);
      video.removeEventListener('seeked', release);
    };
  }, [stage, videoRef, timeMs]);

  return timeMs;
}
