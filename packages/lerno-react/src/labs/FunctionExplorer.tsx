'use client';

import { useMemo, useState } from 'react';
import { CoordinatePlane, FunctionPlotter } from '@medu/lerno';
import { CoordinateGrid } from '../components/CoordinateGrid.js';
import { ActionButton, Panel, SelectField } from '../components/Controls.js';
import { FunctionCurve } from '../components/FunctionCurve.js';
import { Scene } from '../components/Scene.js';
import { usePlayback } from '../hooks/usePlayback.js';
import { controlBar, sceneColors } from '../theme.js';
import { functionPresets, getFunctionPreset } from './presets.js';

const WIDTH = 960;
const HEIGHT = 540;

/**
 * Interactive lab that plots a chosen function family and animates the drawing.
 * Self-contained: it owns its preset selection, its domain, and its scene.
 */
export function FunctionExplorer() {
  const [presetId, setPresetId] = useState(functionPresets[0].id);
  const preset = getFunctionPreset(presetId);
  const playback = usePlayback({ duration: 1600 });

  const plane = useMemo(
    () => new CoordinatePlane({ width: WIDTH, height: HEIGHT, padding: 56, xRange: preset.domain, yRange: preset.yRange }),
    [preset],
  );

  const plotter = useMemo(
    () =>
      new FunctionPlotter({
        fn: preset.fn,
        domain: preset.domain,
        color: preset.color ?? sceneColors.success,
        drawProgress: playback.progress,
      }),
    [preset, playback.progress],
  );

  return (
    <Panel>
      <Scene width={WIDTH} height={HEIGHT} title={preset.label}>
        <CoordinateGrid plane={plane} />
        <FunctionCurve plane={plane} plotter={plotter} />
      </Scene>

      <div className={controlBar}>
        <SelectField
          label="Fonksiyon"
          value={presetId}
          onChange={setPresetId}
          options={functionPresets.map((item) => ({ value: item.id, label: item.label }))}
        />
        <ActionButton onPress={playback.play}>{playback.playing ? 'Drawing…' : 'Draw'}</ActionButton>
        <ActionButton variant="ghost" onPress={playback.reset}>
          Tamamını göster
        </ActionButton>
      </div>
    </Panel>
  );
}
