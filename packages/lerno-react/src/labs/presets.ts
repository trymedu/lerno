import { Molecule2D, type ProjectileSimulation } from '@medu/lerno';

/**
 * Constrains a value to a numeric range.
 * @param value - Value to constrain.
 * @param min - Lower bound.
 * @param max - Upper bound.
 * @returns The value or the violated bound.
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** Shape of `FunctionPreset`. */
export interface FunctionPreset {
  id: string;
  label: string;
  fn: (x: number) => number;
  domain: [number, number];
  yRange: [number, number];
  color?: string;
}

/** Curriculum-oriented function families. */
export const functionPresets: FunctionPreset[] = [
  { id: 'square', label: 'f(x) = x²', fn: (x) => x * x, domain: [-4, 4], yRange: [-1, 10] },
  { id: 'cubic', label: 'f(x) = x³ − 3x', fn: (x) => x ** 3 - 3 * x, domain: [-3, 3], yRange: [-6, 6] },
  { id: 'sine', label: 'f(x) = sin(x)', fn: Math.sin, domain: [-2 * Math.PI, 2 * Math.PI], yRange: [-1.6, 1.6] },
  { id: 'reciprocal', label: 'f(x) = 1/x', fn: (x) => 1 / x, domain: [-4, 4], yRange: [-4, 4] },
  { id: 'sqrt', label: 'f(x) = √x', fn: Math.sqrt, domain: [0, 9], yRange: [-1, 4] },
  { id: 'exp', label: 'f(x) = eˣ', fn: Math.exp, domain: [-3, 3], yRange: [-1, 10] },
];

/**
 * Reads a function preset by id.
 * @param id - Preset key used by the lab control.
 * @returns The preset, falling back to the first entry for unknown ids.
 */
export function getFunctionPreset(id: string): FunctionPreset {
  return functionPresets.find((preset) => preset.id === id) ?? functionPresets[0];
}

/**
 * Computes the projectile position at a fraction of its flight.
 * @param projectile - Simulation to sample.
 * @param progress - Fraction of the flight between zero and one.
 * @returns Coordinates, height, and elapsed time at that fraction.
 */
export function sampleProjectile(projectile: ProjectileSimulation, progress: number) {
  const t = clamp(progress, 0, 1) * projectile.getFlightTime();
  return projectile.getStateAtTime(t);
}

/** Molecule factories live in the core and are re-exported here. */
export const createCarbonDioxide = Molecule2D.createCarbonDioxide;
/** Preset molecule factory for methane. */
export const createMethane = Molecule2D.createMethane;
/** Preset molecule factory for ammonia. */
export const createAmmonia = Molecule2D.createAmmonia;

/** Shape of `MoleculePreset`. */
export interface MoleculePreset {
  id: string;
  label: string;
  formula: string;
  create: () => Molecule2D;
}

/** Preset molecules used by the molecule viewer. */
export const moleculePresets: MoleculePreset[] = [
  { id: 'water', label: 'Su', formula: 'H2O', create: () => Molecule2D.createWater(480, 260, 120) },
  { id: 'carbon-dioxide', label: 'Karbondioksit', formula: 'CO2', create: () => createCarbonDioxide() },
  { id: 'methane', label: 'Metan', formula: 'CH4', create: () => createMethane() },
  { id: 'ammonia', label: 'Amonyak', formula: 'NH3', create: () => createAmmonia() },
];

/**
 * Reads a molecule preset by id.
 * @param id - Preset key used by the lab control.
 * @returns The preset, falling back to the first entry for unknown ids.
 */
export function getMoleculePreset(id: string): MoleculePreset {
  return moleculePresets.find((preset) => preset.id === id) ?? moleculePresets[0];
}
