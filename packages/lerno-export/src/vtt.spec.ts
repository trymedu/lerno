import { describe, expect, it } from 'bun:test';
import { cueAt, parseTimestamp, parseVtt } from './vtt';

describe('parseTimestamp', () => {
  it('converts an hour format to milliseconds', () => {
    expect(parseTimestamp('00:00:01.500')).toBe(1500);
    expect(parseTimestamp('01:02:03.004')).toBe(3_723_004);
  });

  it('accepts an hour-less format', () => {
    expect(parseTimestamp('02:03.250')).toBe(123_250);
  });

  it('accepts a comma decimal', () => {
    expect(parseTimestamp('00:00:02,750')).toBe(2750);
  });

  it('returns NaN for an invalid value', () => {
    expect(Number.isNaN(parseTimestamp('1.5'))).toBe(true);
    expect(Number.isNaN(parseTimestamp('aa:bb'))).toBe(true);
  });
});

describe('parseVtt', () => {
  const source = `WEBVTT

NOTE bu bir not

STYLE
::cue { color: white }

intro
00:00:00.000 --> 00:00:02.000 align:start
First cue

00:00:02.000 --> 00:00:04.500
Second cue
second line
`;

  it('skips NOTE and STYLE blocks', () => {
    const cues = parseVtt(source);
    expect(cues).toHaveLength(2);
    expect(cues[0].text).toBe('First cue');
  });

  it('preserves timings and multiline text', () => {
    const cues = parseVtt(source);
    expect(cues[0].startMs).toBe(0);
    expect(cues[0].endMs).toBe(2000);
    expect(cues[1].text).toBe('Second cue\nsecond line');
  });

  it('drops a cue whose end precedes its start', () => {
    const cues = parseVtt('WEBVTT\n\n00:00:05.000 --> 00:00:01.000\nTers\n');
    expect(cues).toHaveLength(0);
  });

  it('drops an empty cue', () => {
    const cues = parseVtt('WEBVTT\n\n00:00:00.000 --> 00:00:01.000\n\n');
    expect(cues).toHaveLength(0);
  });
});

describe('cueAt', () => {
  const cues = [
    { startMs: 0, endMs: 1000, text: 'a' },
    { startMs: 2000, endMs: 3000, text: 'b' },
  ];

  it('finds the active cue', () => {
    expect(cueAt(cues, 500)?.text).toBe('a');
    expect(cueAt(cues, 2500)?.text).toBe('b');
  });

  it('returns undefined between cues', () => {
    expect(cueAt(cues, 1500)).toBeUndefined();
    expect(cueAt(cues, 1000)).toBeUndefined();
  });
});
