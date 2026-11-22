'use client';

import { useMemo, useState } from 'react';
import { CoordinatePlane, ProjectileSimulation } from '@medu/lerno';
import { CoordinateGrid } from '../components/CoordinateGrid.js';
import { ActionButton, Panel, RangeField, Stats } from '../components/Controls.js';
import { ProjectileTrajectory } from '../components/ProjectileTrajectory.js';
import { Scene } from '../components/Scene.js';
import { usePlayback } from '../hooks/usePlayback.js';
import { controlBar, sceneColors } from '../theme.js';
import { sampleProjectile } from './presets.js';

const WIDTH = 960;
const HEIGHT = 540;

/**
 * Interactive lab that varies launch speed and angle and animates the flight.
 * Self-contained: it owns its simulation, its controls, and its scene.
 */
export function ProjectileLab() {
  const [velocity, setVelocity] = useState(32);
  const [angle, setAngle] = useState(45);
  const playback = usePlayback({ duration: 2200 });

  const projectile = useMemo(() => new ProjectileSimulation(velocity, angle, 9.8, 0), [velocity, angle]);

  const plane = useMemo(() => {
    const range = Math.max(projectile.getRange() * 1.1, 10);
    const height = Math.max(projectile.getMaxHeight() * 1.25, 6);
    return new CoordinatePlane({
      width: WIDTH,
      height: HEIGHT,
      padding: 56,
      xRange: [0, range],
      yRange: [0, height],
      stepX: Math.max(1, Math.round(range / 10)),
      stepY: Math.max(1, Math.round(height / 6)),
    });
  }, [projectile]);

  const state = sampleProjectile(projectile, playback.progress);

  return (
    <Panel>
      <Scene width={WIDTH} height={HEIGHT} title={`${velocity} m/s · ${angle}°`}>
        <CoordinateGrid plane={plane} />
        <ProjectileTrajectory plane={plane} projectile={projectile} progress={playback.progress} color={sceneColors.success} />
      </Scene>

      <div className={controlBar}>
        <RangeField label="Initial speed (m/s)" value={velocity} min={10} max={60} step={1} onChange={setVelocity} />
        <RangeField label="Launch angle (°)" value={angle} min={15} max={85} step={1} onChange={setAngle} />
        <ActionButton onPress={playback.play}>{playback.playing ? 'Flying…' : 'Launch'}</ActionButton>
        <ActionButton variant="ghost" onPress={playback.reset}>
          Sıfırla
        </ActionButton>
      </div>

      <Stats
        items={[
          { label: 'Menzil', value: `${projectile.getRange().toFixed(1)} m` },
          { label: 'Max height', value: `${projectile.getMaxHeight().toFixed(1)} m` },
          { label: 'Flight time', value: `${projectile.getFlightTime().toFixed(2)} s` },
          { label: 'Current speed', value: `${state.speed.toFixed(1)} m/s` },
        ]}
      />
    </Panel>
  );
}
