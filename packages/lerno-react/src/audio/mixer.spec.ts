import { describe, expect, it } from 'bun:test';
import { duckGain, rampConstant } from './mixer';

describe('duckGain', () => {
  it('returns full level without ducking', () => {
    expect(duckGain(false, 0.35)).toBe(1);
    expect(duckGain(false, 0)).toBe(1);
  });

  it('drops to the ducking level', () => {
    expect(duckGain(true, 0.35)).toBeCloseTo(0.35);
    expect(duckGain(true, 1.4)).toBe(1);
    expect(duckGain(true, -0.2)).toBe(0);
  });
});

describe('rampConstant', () => {
  it('turns zero or negative duration into the shortest constant', () => {
    expect(rampConstant(0)).toBeCloseTo(0.01);
    expect(rampConstant(-1)).toBeCloseTo(0.01);
  });

  it('splits the duration into three equal parts', () => {
    expect(rampConstant(0.3)).toBeCloseTo(0.1);
  });
});
