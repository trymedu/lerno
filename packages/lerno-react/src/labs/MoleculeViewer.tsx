'use client';

import { useMemo, useState } from 'react';
import { MoleculeView } from '../components/MoleculeView.js';
import { Panel, SelectField } from '../components/Controls.js';
import { Scene } from '../components/Scene.js';
import { controlBar } from '../theme.js';
import { getMoleculePreset, moleculePresets } from './presets.js';

const WIDTH = 960;
const HEIGHT = 540;

/**
 * Interactive lab that switches between preset molecular geometries.
 * Self-contained: it owns its molecule selection and its scene.
 */
export function MoleculeViewer() {
  const [presetId, setPresetId] = useState(moleculePresets[0].id);
  const preset = getMoleculePreset(presetId);
  const molecule = useMemo(() => preset.create(), [preset]);

  return (
    <Panel>
      <Scene width={WIDTH} height={HEIGHT} title={`${preset.label} · ${preset.formula}`}>
        <MoleculeView molecule={molecule} />
      </Scene>

      <div className={controlBar}>
        <SelectField
          label="Molecule"
          value={presetId}
          onChange={setPresetId}
          options={moleculePresets.map((item) => ({ value: item.id, label: `${item.label} (${item.formula})` }))}
        />
      </div>
    </Panel>
  );
}
