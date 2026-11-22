import { Timeline, findCrossedAnchor } from './timeline';

describe('Timeline', () => {
  it('computes progress and frame', () => {
    const timeline = new Timeline({ durationMs: 1000, fps: 30 });
    timeline.seek(500);
    expect(timeline.progress).toBe(0.5);
    expect(timeline.frame).toBe(15);
  });

  it('clamps the seek value', () => {
    const timeline = new Timeline({ durationMs: 1000 });
    timeline.seek(-100);
    expect(timeline.timeMs).toBe(0);
    timeline.seek(5000);
    expect(timeline.timeMs).toBe(1000);
    expect(timeline.finished).toBe(true);
  });

  it('advance and loop work', () => {
    const timeline = new Timeline({ durationMs: 1000, loop: true });
    timeline.advance(1200);
    expect(timeline.timeMs).toBeCloseTo(200, 6);
    expect(timeline.finished).toBe(false);
  });

  it('rejects an invalid duration', () => {
    expect(() => new Timeline({ durationMs: 0 })).toThrow(RangeError);
  });

  it('finds the crossed anchor', () => {
    const anchors = [
      { atMs: 500, value: 'a' },
      { atMs: 1500, value: 'b' },
    ];
    expect(findCrossedAnchor(anchors, 0, 600)?.value).toBe('a');
    expect(findCrossedAnchor(anchors, 600, 1400)).toBeUndefined();
    expect(findCrossedAnchor(anchors, 1400, 1600)?.value).toBe('b');
  });
});
