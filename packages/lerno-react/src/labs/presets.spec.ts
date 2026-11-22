import { describe, expect, it } from 'bun:test';
import { ProjectileSimulation } from '@medu/lerno';
import {
  clamp,
  createAmmonia,
  createCarbonDioxide,
  createMethane,
  functionPresets,
  getFunctionPreset,
  getMoleculePreset,
  moleculePresets,
  sampleProjectile,
} from './presets';

describe('clamp', () => {
  it('clamps out-of-range values', () => {
    expect(clamp(-5, 0, 10)).toBe(0);
    expect(clamp(15, 0, 10)).toBe(10);
    expect(clamp(5, 0, 10)).toBe(5);
  });
});

describe('functionPresets', () => {
  it('falls back to the first preset for an unknown id', () => {
    expect(getFunctionPreset('missing').id).toBe(functionPresets[0].id);
  });

  it('every preset produces finite values on its domain', () => {
    for (const preset of functionPresets) {
      const [min, max] = preset.domain;
      // Sample 1/x without the singularity at 0
      const sample = min === 0 ? max : min === -max ? max : (min + max) / 2;
      expect(Number.isFinite(preset.fn(sample))).toBe(true);
    }
  });
});

describe('sampleProjectile', () => {
  const projectile = new ProjectileSimulation(30, 45, 9.8, 0);

  it('starts at the origin', () => {
    const state = sampleProjectile(projectile, 0);
    expect(state.x).toBeCloseTo(0, 6);
    expect(state.y).toBeCloseTo(0, 6);
  });

  it('reaches the range at the end of the flight', () => {
    const state = sampleProjectile(projectile, 1);
    expect(state.x).toBeCloseTo(projectile.getRange(), 4);
    expect(state.y).toBeCloseTo(0, 4);
  });

  it('clamps out-of-range progress', () => {
    const state = sampleProjectile(projectile, 2);
    expect(state.x).toBeCloseTo(projectile.getRange(), 4);
  });
});

describe('molecule factories', () => {
  it('CO2 is linear with two double bonds', () => {
    const molecule = createCarbonDioxide();
    expect(molecule.atoms).toHaveLength(3);
    expect(molecule.bonds).toHaveLength(2);
    expect(molecule.bonds.every((bond) => bond.order === 2)).toBe(true);
    expect(molecule.renderSvgElements().bonds).toHaveLength(2);
  });

  it('CH4 has four singly bonded hydrogens', () => {
    const molecule = createMethane();
    expect(molecule.atoms).toHaveLength(5);
    expect(molecule.bonds).toHaveLength(4);
    expect(molecule.bonds.every((bond) => bond.order === 1)).toBe(true);
  });

  it('NH3 has three bonds and a negative charge on nitrogen', () => {
    const molecule = createAmmonia();
    const nitrogen = molecule.atoms.find((atom) => atom.id === 'N');
    expect(nitrogen?.charge).toBe('δ-');
    expect(molecule.bonds).toHaveLength(3);
  });

  it('every molecule preset produces drawable output', () => {
    for (const preset of moleculePresets) {
      const molecule = preset.create();
      const rendered = molecule.renderSvgElements();
      expect(rendered.atoms.length).toBeGreaterThan(0);
      expect(rendered.bonds.length).toBeGreaterThan(0);
    }
    expect(getMoleculePreset('missing').id).toBe(moleculePresets[0].id);
  });
});
