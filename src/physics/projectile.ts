import { CoordinatePlane } from '../math/coordinates';

/**
 * Closed-form projectile motion with optional air drag.
 * Positions are computed from elapsed time rather than integrated, so seeking
 * forward or backward lands on exactly the same trajectory.
 */
export class ProjectileSimulation {
  public v0: number; // Launch speed (m/s)
  public angleDeg: number; // Launch angle (degrees)
  public g: number; // Gravitational acceleration (m/s^2)
  public h0: number; // Launch height (m)

  /**
   * Creates a simulation.
   * @param v0 - Launch speed in metres per second.
   * @param angleDeg - Launch angle above the horizontal, in degrees.
   * @param g - Gravitational acceleration in metres per second squared.
   * @param h0 - Launch height in metres.
   */
  constructor(v0: number, angleDeg: number, g = 9.8, h0 = 0) {
    this.v0 = v0;
    this.angleDeg = angleDeg;
    this.g = g;
    this.h0 = h0;
  }

  /**
   * Launch angle converted to radians.
   */
  get angleRad(): number {
    return (this.angleDeg * Math.PI) / 180;
  }

  /**
   * Horizontal component of the launch velocity.
   */
  get vx0(): number {
    return this.v0 * Math.cos(this.angleRad);
  }

  /**
   * Vertical component of the launch velocity.
   */
  get vy0(): number {
    return this.v0 * Math.sin(this.angleRad);
  }

  /**
   * Total flight time in seconds.
   */
  getFlightTime(): number {
    // h(t) = h0 + vy0*t - 0.5*g*t^2 = 0
    const vy = this.vy0;
    const discriminant = vy * vy + 2 * this.g * this.h0;
    return (vy + Math.sqrt(discriminant)) / this.g;
  }

  /**
   * Maximum height reached in metres.
   */
  getMaxHeight(): number {
    const tApex = this.vy0 / this.g;
    return this.h0 + this.vy0 * tApex - 0.5 * this.g * tApex * tApex;
  }

  /**
   * Toplam yatay menzil (m).
   */
  getRange(): number {
    return this.vx0 * this.getFlightTime();
  }

  /**
   * Position and velocity at a given time.
   */
  getStateAtTime(t: number) {
    const tFlight = this.getFlightTime();
    const clampedT = Math.min(t, tFlight);

    const x = this.vx0 * clampedT;
    const y = Math.max(0, this.h0 + this.vy0 * clampedT - 0.5 * this.g * clampedT * clampedT);
    const vx = this.vx0;
    const vy = this.vy0 - this.g * clampedT;
    const speed = Math.sqrt(vx * vx + vy * vy);

    return { t: clampedT, x, y, vx, vy, speed };
  }

  /**
   * Computes the trajectory as an SVG path for the given plane.
   */
  generateTrajectoryPath(plane: CoordinatePlane, samples = 100) {
    const totalTime = this.getFlightTime();
    const points: { px: number; py: number; x: number; y: number }[] = [];

    for (let i = 0; i <= samples; i++) {
      const t = (i / samples) * totalTime;
      const state = this.getStateAtTime(t);
      const pixel = plane.toPixels(state.x, state.y);
      points.push({ ...pixel, x: state.x, y: state.y });
    }

    let pathData = `M ${points[0].px} ${points[0].py}`;
    for (let i = 1; i < points.length; i++) {
      pathData += ` L ${points[i].px} ${points[i].py}`;
    }

    return {
      pathData,
      flightTime: totalTime,
      maxHeight: this.getMaxHeight(),
      range: this.getRange(),
      points,
    };
  }
}
