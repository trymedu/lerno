import type { MediaAnchor } from '../content/schema';
import { crossedAnchors, firstUnseenAnchor } from './media';

const anchors: MediaAnchor[] = [
  { id: 'a1', atMs: 1000, kind: 'info', label: 'First' },
  { id: 'a2', atMs: 3000, kind: 'pause', label: 'Second' },
  { id: 'a3', atMs: 5000, kind: 'question', label: 'Third' },
];

describe('media anchor helpers', () => {
  it('returns crossed anchors in order for the given window', () => {
    expect(crossedAnchors(anchors, 0, 3500).map((anchor) => anchor.id)).toEqual(['a1', 'a2']);
    expect(crossedAnchors(anchors, 3500, 6000).map((anchor) => anchor.id)).toEqual(['a3']);
    expect(crossedAnchors(anchors, 5000, 5500)).toEqual([]);
  });

  it('finds the first unseen anchor', () => {
    const seen = new Set(['a1']);
    expect(firstUnseenAnchor(anchors, seen, 4000)?.id).toBe('a2');
    expect(firstUnseenAnchor(anchors, new Set(['a1', 'a2', 'a3']), 6000)).toBeUndefined();
    expect(firstUnseenAnchor(anchors, new Set(), 500)).toBeUndefined();
  });
});
