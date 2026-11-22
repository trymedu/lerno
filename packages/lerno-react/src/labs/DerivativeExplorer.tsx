'use client';

import { useMemo, useState } from 'react';
import { CalculusEngine, CoordinatePlane, FunctionPlotter } from '@medu/lerno';
import { CoordinateGrid } from '../components/CoordinateGrid.js';
import { Panel, RangeField, SelectField, Stats } from '../components/Controls.js';
import { FunctionCurve } from '../components/FunctionCurve.js';
import { Scene } from '../components/Scene.js';
import { TangentLine } from '../components/TangentLine.js';
import { controlBar, sceneColors } from '../theme.js';
import { clamp, functionPresets, getFunctionPreset } from './presets.js';

const WIDTH = 960;
const HEIGHT = 540;

/**
 * Interactive lab that tracks the derivative at a movable point.
 * Self-contained: it owns its function, its slider state, and its scene.
 */
export function DerivativeExplorer() {
  const [presetId, setPresetId] = useState(functionPresets[0].id);
  const [x0, setX0] = useState(1);
  const preset = getFunctionPreset(presetId);

  const [domainMin, domainMax] = preset.domain;
  const safeX0 = clamp(x0, domainMin, domainMax);

  const plane = useMemo(
    () => new CoordinatePlane({ width: WIDTH, height: HEIGHT, padding: 56, xRange: preset.domain, yRange: preset.yRange }),
    [preset],
  );

  const plotter = useMemo(
    () => new FunctionPlotter({ fn: preset.fn, domain: preset.domain, color: sceneColors.success }),
    [preset],
  );

  const y0 = preset.fn(safeX0);
  const slope = CalculusEngine.derivative(preset.fn, safeX0);
  const length = (domainMax - domainMin) * 0.18;

  return (
    <Panel>
      <Scene width={WIDTH} height={HEIGHT} title={`${preset.label} · tangent slope`}>
        <CoordinateGrid plane={plane} />
        <FunctionCurve plane={plane} plotter={plotter} />
        <TangentLine plane={plane} fn={preset.fn} x0={safeX0} length={length} />
      </Scene>

      <div className={controlBar}>
        <SelectField
          label="Fonksiyon"
          value={presetId}
          onChange={setPresetId}
          options={functionPresets.map((item) => ({ value: item.id, label: item.label }))}
        />
        <RangeField label="Point x₀" value={safeX0} min={domainMin} max={domainMax} step={0.1} onChange={setX0} />
      </div>

      <Stats
        items={[
          { label: 'x₀', value: safeX0.toFixed(2) },
          { label: 'f(x₀)', value: y0.toFixed(2) },
          { label: "f'(x₀) instantaneous slope", value: slope.toFixed(2) },
        ]}
      />
    </Panel>
  );
}
