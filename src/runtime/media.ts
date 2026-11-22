import type { MediaAnchor } from '../content/schema';

/**
 * Video and audio timeline helpers.
 * Anchors on media nodes fire against the real video or audio time; these helpers
 * report which anchors the playhead has crossed.
 */
export function crossedAnchors(
  anchors: readonly MediaAnchor[],
  previousMs: number,
  currentMs: number,
): MediaAnchor[] {
  return anchors
    .filter((anchor) => anchor.atMs > previousMs && anchor.atMs <= currentMs)
    .sort((a, b) => a.atMs - b.atMs);
}

/**
 * Finds the earliest anchor the viewer has not answered yet.
 */
export function firstUnseenAnchor(
  anchors: readonly MediaAnchor[],
  seen: ReadonlySet<string>,
  atMs: number,
): MediaAnchor | undefined {
  return anchors
    .filter((anchor) => !seen.has(anchor.id) && anchor.atMs <= atMs)
    .sort((a, b) => a.atMs - b.atMs)[0];
}
