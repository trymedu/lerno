'use client';

import { useMemo, useState } from 'react';
import { CalculusEngine, CoordinatePlane, FunctionPlotter } from '@medu/lerno';
import { CoordinateGrid } from '../components/CoordinateGrid.js';
import { Panel, RangeField, SelectField, Stats } from '../components/Controls.js';
import { FunctionCurve } from '../components/FunctionCurve.js';
import { RiemannSum } from '../components/RiemannSum.js';
import { Scene } from '../components/Scene.js';
import { controlBar, sceneColors } from '../theme.js';
import { clamp, functionPresets, getFunctionPreset } from './presets.js';

const WIDTH = 960;
const HEIGHT = 540;

const methodOptions = [
  { value: 'left', label: 'Left endpoint' },
  { value: 'right', label: 'Right endpoint' },
  { value: 'midpoint', label: 'Midpoint' },
];

type RiemannMethod = 'left' | 'right' | 'midpoint';

/**
 * Type guard for the Riemann sampling methods accepted by the control.
 * @param value - Raw string coming from the select control.
 * @returns True when the value names a supported method.
 */
function isRiemannMethod(value: string): value is RiemannMethod {
  return value === 'left' || value === 'right' || value === 'midpoint';
}

/**
 * Interactive lab that converges a Riemann sum as rectangles are added.
 * Self-contained: it owns its limits, method, rectangle count, and its scene.
 */
export function RiemannSumExplorer() {
  const [presetId, setPresetId] = useState(functionPresets[0].id);
  const [count, setCount] = useState(8);
  const [method, setMethod] = useState<RiemannMethod>('left');
  const preset = getFunctionPreset(presetId);

  const [domainMin, domainMax] = preset.domain;
  const [a, b] = useMemo<[number, number]>(() => {
    const start = domainMin + (domainMax - domainMin) * 0.2;
    const end = domainMax - (domainMax - domainMin) * 0.2;
    return [Number(start.toFixed(2)), Number(end.toFixed(2))];
  }, [domainMin, domainMax]);

  const plane = useMemo(
    () => new CoordinatePlane({ width: WIDTH, height: HEIGHT, padding: 56, xRange: preset.domain, yRange: preset.yRange }),
    [preset],
  );

  const plotter = useMemo(
    () => new FunctionPlotter({ fn: preset.fn, domain: preset.domain, color: sceneColors.success }),
    [preset],
  );

  const safeCount = clamp(Math.round(count), 2, 60);
  const { totalArea, dx } = CalculusEngine.getRiemannRectangles(plane, preset.fn, a, b, safeCount, method);

  return (
    <Panel>
      <Scene width={WIDTH} height={HEIGHT} title={`${preset.label} · Riemann sum`}>
        <CoordinateGrid plane={plane} />
        <RiemannSum plane={plane} fn={preset.fn} a={a} b={b} n={safeCount} method={method} />
        <FunctionCurve plane={plane} plotter={plotter} />
      </Scene>

      <div className={controlBar}>
        <SelectField
          label="Fonksiyon"
          value={presetId}
          onChange={setPresetId}
          options={functionPresets.map((item) => ({ value: item.id, label: item.label }))}
        />
        <SelectField
          label="Sampling"
          value={method}
          onChange={(value) => {
            if (isRiemannMethod(value)) setMethod(value);
          }}
          options={methodOptions}
        />
        <RangeField label="Rectangle count" value={safeCount} min={2} max={60} step={1} onChange={setCount} />
      </div>

      <Stats
        items={[
          { label: 'Interval', value: `[${a}, ${b}]` },
          { label: 'Δx', value: dx.toFixed(3) },
          { label: 'Approximate area', value: totalArea.toFixed(3) },
        ]}
      />
    </Panel>
  );
}
