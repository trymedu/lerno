'use client';

/**
 * Music under narration, mixed in the browser.
 *
 * The voice is an existing media element (usually the lesson video); the music
 * is a separate element. Both are routed through one `AudioContext`, so the
 * music can duck while the voice speaks instead of fighting it. Nothing here
 * touches the video pixels, and the same graph drives the exported mix when the
 * export pipeline learns audio.
 */

export interface MusicOptions {
  src: string;
  /** 0..1, applied before ducking. Defaults to 0.6. */
  volume?: number;
  loop?: boolean;
}

/** Options accepted by `Mixer`. */
export interface MixerOptions {
  music: MusicOptions;
  /** Music gain while the voice is active. Defaults to 0.35. */
  duckLevel?: number;
  /** Ramp length in seconds. Defaults to 0.18. */
  rampSeconds?: number;
  /** Context override, mainly for tests. */
  context?: AudioContext;
  /** Called whenever the duck state changes, for a UI indicator. */
  onDuckChange?: (ducked: boolean) => void;
}

/** Shape of `AudioMixer`. */
export interface AudioMixer {
  /** Routes an existing media element through the mixer; idempotent per element. */
  attachVoice(element: HTMLMediaElement): void;
  /** Starts the music and resumes the context; call from a user gesture. */
  play(): Promise<void>;
  /** Pauses the music; the voice element keeps its own controls. */
  pause(): void;
  setMusicVolume(value: number): void;
  /** Manually ducks, for narration that is not an element. */
  setDucked(active: boolean): void;
  readonly ducked: boolean;
  dispose(): void;
}

/** Target music gain for a duck state; extracted so the rule is testable. */
export function duckGain(ducked: boolean, duckLevel: number): number {
  return ducked ? Math.max(0, Math.min(1, duckLevel)) : 1;
}

/** Ramp time constant that reaches the target in roughly `seconds`. */
export function rampConstant(seconds: number): number {
  return Math.max(0.01, seconds / 3);
}

/** Creates an audio mixer bound to the player timeline. */
export function createAudioMixer(options: MixerOptions): AudioMixer {
  const duckLevel = options.duckLevel ?? 0.35;
  const ramp = rampConstant(options.rampSeconds ?? 0.18);
  let context: AudioContext | undefined = options.context;
  let musicElement: HTMLAudioElement | undefined;
  let musicGain: GainNode | undefined;
  let musicVolume = options.music.volume ?? 0.6;
  const voices = new WeakSet<HTMLMediaElement>();
  let ducked = false;
  let disposed = false;

  function ensureContext(): AudioContext {
    if (!context) {
      const Ctor = window.AudioContext;
      context = new Ctor();
    }
    return context;
  }

  function ensureMusic(): HTMLAudioElement {
    if (musicElement) return musicElement;
    const audio = new Audio(options.music.src);
    audio.loop = options.music.loop ?? true;
    audio.preload = 'auto';
    const ctx = ensureContext();
    const source = ctx.createMediaElementSource(audio);
    musicGain = ctx.createGain();
    musicGain.gain.value = duckGain(ducked, duckLevel) * musicVolume;
    source.connect(musicGain).connect(ctx.destination);
    musicElement = audio;
    return audio;
  }

  function applyMusicGain(): void {
    if (!musicGain || !context) return;
    musicGain.gain.setTargetAtTime(duckGain(ducked, duckLevel) * musicVolume, context.currentTime, ramp);
  }

  function duck(active: boolean): void {
    if (ducked === active) return;
    ducked = active;
    applyMusicGain();
    options.onDuckChange?.(active);
  }

  return {
    attachVoice(element) {
      if (disposed || voices.has(element)) return;
      voices.add(element);
      const ctx = ensureContext();
      const source = ctx.createMediaElementSource(element);
      source.connect(ctx.destination);
      const update = (): void => duck(!element.paused && !element.ended);
      element.addEventListener('play', update);
      element.addEventListener('playing', update);
      element.addEventListener('pause', update);
      element.addEventListener('ended', update);
      update();
    },
    async play() {
      if (disposed) return;
      const ctx = ensureContext();
      if (ctx.state === 'suspended') await ctx.resume();
      const audio = ensureMusic();
      applyMusicGain();
      await audio.play();
    },
    pause() {
      musicElement?.pause();
      duck(false);
    },
    setMusicVolume(value) {
      musicVolume = Math.max(0, Math.min(1, value));
      applyMusicGain();
    },
    setDucked(active) {
      if (disposed) return;
      duck(active);
    },
    get ducked() {
      return ducked;
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      musicElement?.pause();
      musicElement = undefined;
      musicGain?.disconnect();
      musicGain = undefined;
      if (!options.context) void context?.close();
      context = undefined;
    },
  };
}
