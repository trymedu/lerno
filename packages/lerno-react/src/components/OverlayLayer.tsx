'use client';

import { Component, Suspense, type ComponentType, type ErrorInfo, type ReactNode } from 'react';
import type { InteractionLayer, VariableValue } from '@medu/lerno';
import type { LernoComponentMap, LayerTone } from './component-types.js';
import { activeLayers, layerOpacity, resolveLayerProps, type VariableMap } from './interactions.js';

/** Props accepted by `OverlayLayer`. */
export interface OverlayLayerProps {
  layers: readonly InteractionLayer[];
  currentMs: number;
  variables: VariableMap;
  components: LernoComponentMap;
  onVariableChange?: (variable: string, value: VariableValue) => void;
  tone?: LayerTone;
  /** `overlay` draws over the video; `inline` draws below it in flow. */
  mode?: 'overlay' | 'inline';
}

class LayerBoundary extends Component<{ children: ReactNode; label: string }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError(): { failed: boolean } {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error(`[lerno] failed to render layer "${this.props.label}"`, error, info.componentStack);
  }

  render(): ReactNode {
    if (this.state.failed) {
      return (
        <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          Katman çizilemedi: {this.props.label}
        </div>
      );
    }
    return this.props.children;
  }
}

function MissingLayer({ type }: { type: string }) {
  return (
    <div className="rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900">
      Component not registered: <span className="font-semibold">{type}</span>
    </div>
  );
}

/**
 * Component layers shown over the video for a time range.
 * The container ignores pointer events; only components are clickable.
 */
export function OverlayLayer({ layers, currentMs, variables, components, onVariableChange, tone, mode = 'overlay' }: OverlayLayerProps) {
  const visible = activeLayers(layers, currentMs, variables);
  const inline = mode === 'inline';

  return (
    <div className={inline ? 'flex flex-col gap-2' : 'pointer-events-none absolute inset-0 z-10'}>
      {visible.map((layer, index) => {
        const ComponentView = components[layer.component] as ComponentType<Record<string, unknown>> | undefined;
        const props = resolveLayerProps(layer.props, variables) as Record<string, unknown>;
        const bound = layer.bind.value;
        const value = bound ? variables[bound] : undefined;
        const opacity = layerOpacity(layer, currentMs);

        return (
          <div
            key={layer.id}
            className={inline ? 'w-full' : 'pointer-events-auto absolute'}
            style={
              inline
                ? { opacity }
                : {
                    left: `${layer.placement.x * 100}%`,
                    top: `${layer.placement.y * 100}%`,
                    width: `${layer.placement.w * 100}%`,
                    height: `${layer.placement.h * 100}%`,
                    zIndex: index + 1,
                    opacity,
                    transform: `translateY(${(1 - opacity) * 6}px)`,
                  }
            }
          >
            <LayerBoundary label={layer.id}>
              <Suspense fallback={<div className="h-9 animate-pulse rounded-lg bg-zinc-200/70" />}>
                {ComponentView ? (
                  <ComponentView
                    {...props}
                    tone={(props.tone as LayerTone | undefined) ?? tone}
                    value={value}
                    onChange={
                      bound && onVariableChange
                        ? (next: VariableValue) => onVariableChange(bound, next)
                        : undefined
                    }
                  />
                ) : (
                  <MissingLayer type={layer.component} />
                )}
              </Suspense>
            </LayerBoundary>
          </div>
        );
      })}
    </div>
  );
}
