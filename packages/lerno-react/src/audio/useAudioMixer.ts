'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createAudioMixer, type AudioMixer, type MixerOptions } from './mixer.js';

/** Result of `UseAudioMixer`. */
export interface UseAudioMixerResult {
  /** Routes the lesson video through the mixer so music ducks under its audio. */
  attachVoice(element: HTMLMediaElement | null): void;
  toggle(): void;
  playing: boolean;
  ducked: boolean;
  setMusicVolume(value: number): void;
}

/**
 * React binding for {@link createAudioMixer}. The context is created on the
 * first user action, because browsers refuse to start audio otherwise.
 */
export function useAudioMixer(options: MixerOptions): UseAudioMixerResult {
  const mixerRef = useRef<AudioMixer | null>(null);
  const [playing, setPlaying] = useState(false);
  const [ducked, setDucked] = useState(false);

  const ensure = useCallback(() => {
    if (!mixerRef.current) {
      mixerRef.current = createAudioMixer({ ...options, onDuckChange: setDucked });
    }
    return mixerRef.current;
  }, [options]);

  useEffect(() => {
    return () => {
      mixerRef.current?.dispose();
      mixerRef.current = null;
    };
  }, []);

  const attachVoice = useCallback(
    (element: HTMLMediaElement | null) => {
      if (element) ensure().attachVoice(element);
    },
    [ensure],
  );

  const toggle = useCallback(() => {
    const mixer = ensure();
    if (playing) {
      mixer.pause();
      setPlaying(false);
    } else {
      void mixer.play();
      setPlaying(true);
    }
  }, [ensure, playing]);

  const setMusicVolume = useCallback(
    (value: number) => {
      ensure().setMusicVolume(value);
    },
    [ensure],
  );

  return { attachVoice, toggle, playing, ducked, setMusicVolume };
}
