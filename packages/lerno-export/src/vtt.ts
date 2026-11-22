/** One timed caption cue. */
export interface CaptionCue {
  startMs: number;
  endMs: number;
  text: string;
}

/**
 * Parses a WebVTT timestamp.
 *
 * Accepts `hh:mm:ss.mmm`, `mm:ss.mmm`, and the comma decimal separator that
 * many exporters still write.
 *
 * @param value - Timestamp as written before or after `-->`.
 * @returns Milliseconds, or `NaN` when the value is not a timestamp.
 */
export function parseTimestamp(value: string): number {
  const text = value.trim().replace(',', '.');
  const parts = text.split(':');
  if (parts.length < 2 || parts.length > 3) return Number.NaN;

  const seconds = Number(parts.pop());
  const minutes = Number(parts.pop());
  const hours = parts.length > 0 ? Number(parts[0]) : 0;
  if (![seconds, minutes, hours].every(Number.isFinite)) return Number.NaN;

  return Math.round(((hours * 60 + minutes) * 60 + seconds) * 1000);
}

/**
 * Parses a WebVTT file into cues, sorted by start time.
 *
 * `NOTE`, `STYLE`, and `REGION` blocks are skipped, cue identifiers are
 * ignored, and cues without text are dropped. Cue settings after the end
 * timestamp are discarded.
 *
 * @param source - Full file contents.
 * @returns The cues the renderer can draw.
 */
export function parseVtt(source: string): CaptionCue[] {
  const blocks = source.replace(/\r\n/g, '\n').split(/\n{2,}/);
  const cues: CaptionCue[] = [];

  for (const block of blocks) {
    const lines = block.split('\n').filter((line) => line.trim().length > 0);
    if (lines.length === 0) continue;
    if (/^(WEBVTT|NOTE|STYLE|REGION)\b/.test(lines[0])) continue;

    const timingIndex = lines.findIndex((line) => line.includes('-->'));
    if (timingIndex < 0) continue;

    const [rawStart, rawEnd] = lines[timingIndex].split('-->');
    const startMs = parseTimestamp(rawStart);
    const endMs = parseTimestamp((rawEnd ?? '').trim().split(/\s+/)[0] ?? '');
    if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs <= startMs) continue;

    const text = lines.slice(timingIndex + 1).join('\n').trim();
    if (text) cues.push({ startMs, endMs, text });
  }

  return cues.sort((left, right) => left.startMs - right.startMs);
}

/**
 * Finds the cue showing at a playhead.
 *
 * @param cues - Parsed cues.
 * @param timeMs - Playhead in milliseconds.
 * @returns The active cue, or undefined between cues.
 */
export function cueAt(cues: readonly CaptionCue[], timeMs: number): CaptionCue | undefined {
  return cues.find((cue) => timeMs >= cue.startMs && timeMs < cue.endMs);
}
