'use client';

import { useState } from 'react';
import { Button, Chip } from '@heroui/react';
import { type HotspotNode } from '@medu/lerno';

import { sceneColors } from '../theme.js';

/** Props accepted by `HotspotView`. */
export interface HotspotViewProps {
  node: HotspotNode;
  src: string;
}

/**
 * Image hotspot with two modes.
 * Explore opens every spot freely, while find requires the learner to locate the
 * spots that were marked correct in the document.
 */
export function HotspotView({ node, src }: HotspotViewProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [found, setFound] = useState<string[]>([]);

  const active = node.spots.find((spot) => spot.id === activeId) ?? null;
  const targets = node.spots.filter((spot) => spot.correct);
  const foundCorrect = found.filter((id) => targets.some((spot) => spot.id === id)).length;
  const complete = targets.length > 0 && foundCorrect === targets.length;

  function select(id: string): void {
    setActiveId(id);
    if (node.mode === 'find') setFound((current) => (current.includes(id) ? current : [...current, id]));
  }

  function reset(): void {
    setFound([]);
    setActiveId(null);
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3">
        {node.title ? <span className="text-sm font-semibold text-foreground">{node.title}</span> : null}
        {node.mode === 'find' ? (
          <Chip color={complete ? 'success' : 'default'} className="tabular-nums">
            {foundCorrect}/{targets.length} bulundu
          </Chip>
        ) : (
          <Chip color="default" className="tabular-nums">
            {node.spots.length} nokta
          </Chip>
        )}
        {found.length > 0 ? (
          <Button size="sm" variant="ghost" className="ms-auto" onPress={reset}>
            Sıfırla
          </Button>
        ) : null}
      </div>

      <div className="relative w-full overflow-hidden rounded-2xl bg-default">
        {src ? <img src={src} alt={node.title ?? ''} className="block w-full" /> : <div className="h-64" />}
        {node.spots.map((spot, index) => {
          const isFound = found.includes(spot.id);
          const isActive = activeId === spot.id;
          return (
            <button
              key={spot.id}
              type="button"
              aria-label={spot.label}
              onClick={() => select(spot.id)}
              className="absolute flex h-7 w-7 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-white text-xs font-medium text-white shadow-md transition-transform hover:scale-110"
              style={{
                left: `${spot.x * 100}%`,
                top: `${spot.y * 100}%`,
                backgroundColor: isFound ? sceneColors.success : isActive ? sceneColors.accent : sceneColors.primary,
                outline: isActive ? `3px solid ${sceneColors.primary}55` : 'none',
              }}
            >
              {isFound ? '✓' : index + 1}
            </button>
          );
        })}
      </div>

      {active ? (
        <div className="flex flex-col gap-1 rounded-2xl border border-black/[0.06] p-4 dark:border-white/[0.08]">
          <span className="text-sm font-semibold text-foreground">{active.label}</span>
          {active.body ? <span className="text-sm text-muted">{active.body}</span> : null}
          {node.mode === 'find' && !active.correct ? (
            <span className="text-xs text-muted">Bu nokta hedeflenenler arasında değil.</span>
          ) : null}
        </div>
      ) : (
        <p className="text-xs text-muted">Noktalardan birine dokunun.</p>
      )}
    </div>
  );
}
