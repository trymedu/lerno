import { ProjectileSimulation } from './projectile';
import { CoordinatePlane } from '../math/coordinates';

describe('ProjectileSimulation', () => {
  it('should calculate flight time, range and max height for v0=20 m/s, 45 deg, g=10', () => {
    const sim = new ProjectileSimulation(20, 45, 10, 0);

    const flightTime = sim.getFlightTime();
    expect(flightTime).toBeCloseTo(2 * Math.sqrt(2), 2); // ~2.828 s

    const maxH = sim.getMaxHeight();
    expect(maxH).toBeCloseTo(10, 1); // 10 m

    const range = sim.getRange();
    expect(range).toBeCloseTo(40, 1); // 40 m
  });

  it('should generate trajectory path points for canvas', () => {
    const plane = new CoordinatePlane({ xRange: [0, 50], yRange: [0, 20] });
    const sim = new ProjectileSimulation(20, 45, 10, 0);
    const traj = sim.generateTrajectoryPath(plane, 20);

    expect(traj.points).toHaveLength(21);
    expect(traj.pathData).toContain('M');
  });
});
