/** `Vector3Tuple` type. */
export type Vector3Tuple = [number, number, number];

/** Transform channels that a variable can drive (advanced variable management). */
export type TransformChannel =
  | 'position.x'
  | 'position.y'
  | 'position.z'
  | 'rotation.x'
  | 'rotation.y'
  | 'rotation.z'
  | 'scale.x'
  | 'scale.y'
  | 'scale.z'
  | 'material.opacity'
  | 'material.metalness';

/** `Bindings` type. */
export type Bindings = Partial<Record<TransformChannel, string>>;

/** Shape of `Transform3D`. */
export interface Transform3D {
  position?: Vector3Tuple;
  rotation?: Vector3Tuple;
  scale?: Vector3Tuple;
  /** Channel to variable name mapping. The runtime applies it on every frame. */
  bindings?: Bindings;
}

/** Options accepted by `Surface`. */
export interface SurfaceOptions {
  /** Number of segments along U (x). */
  uSegments?: number;
  /** Number of segments along V (z). */
  vSegments?: number;
  uRange?: [number, number];
  vRange?: [number, number];
  /** Lower end of the height gradient. */
  colorLow?: string;
  /** Upper end of the height gradient. */
  colorHigh?: string;
}

/** `GeometrySpec` type. */
export type GeometrySpec =
  | { type: 'box'; width?: number; height?: number; depth?: number }
  | { type: 'sphere'; radius?: number; widthSegments?: number; heightSegments?: number }
  | { type: 'cylinder'; radiusTop?: number; radiusBottom?: number; height?: number; radialSegments?: number }
  | { type: 'cone'; radius?: number; height?: number; radialSegments?: number }
  | { type: 'torus'; radius?: number; tube?: number; radialSegments?: number; tubularSegments?: number }
  | { type: 'plane'; width?: number; height?: number }
  /** `z = f(u, v)` surface. It carries a function, so it cannot be serialized. */
  | ({ type: 'surface'; fn: (u: number, v: number) => number } & SurfaceOptions)
  /** Pre-sampled height data. This form is serializable. */
  | ({ type: 'heightfield'; uSegments: number; vSegments: number; uRange: [number, number]; vRange: [number, number]; heights: number[] } & Pick<
      SurfaceOptions,
      'colorLow' | 'colorHigh'
    >);

/** Declarative specification of `Material`. */
export interface MaterialSpec {
  color?: string;
  emissive?: string;
  metalness?: number;
  roughness?: number;
  opacity?: number;
  transparent?: boolean;
  wireframe?: boolean;
  /** Use the vertex colors stored in the surface geometry. */
  vertexColors?: boolean;
}

/** Shape of `MeshObject`. */
export interface MeshObject {
  kind: 'mesh';
  name?: string;
  geometry: GeometrySpec;
  material?: MaterialSpec;
  transform?: Transform3D;
}

/** Shape of `GroupObject`. */
export interface GroupObject {
  kind: 'group';
  name?: string;
  children: SceneObject[];
  transform?: Transform3D;
}

/** Shape of `LightObject`. */
export interface LightObject {
  kind: 'light';
  name?: string;
  type: 'ambient' | 'directional' | 'point';
  color?: string;
  intensity?: number;
  position?: Vector3Tuple;
}

/** `SceneObject` type. */
export type SceneObject = MeshObject | GroupObject | LightObject;

/** Declarative specification of `Camera`. */
export interface CameraSpec {
  position?: Vector3Tuple;
  lookAt?: Vector3Tuple;
  fov?: number;
}

/** Declarative specification of `Scene3D`. */
export interface Scene3DSpec {
  objects: SceneObject[];
  camera?: CameraSpec;
  background?: string;
}

// ---------------------------------------------------------------------------
// Convenience constructors
// ---------------------------------------------------------------------------

/**
 * Builds an axis-aligned box mesh object.
 *
 * @param size - Edge lengths in scene units; omitted dimensions default to `1`.
 * @param material - Surface material applied to the box.
 * @param transform - Initial position, rotation, and scale.
 * @returns A mesh object ready for the scene graph.
 */
export function box(
  size: { width?: number; height?: number; depth?: number } = {},
  material: MaterialSpec = {},
  transform: Transform3D = {},
): MeshObject {
  return { kind: 'mesh', geometry: { type: 'box', ...size }, material, transform };
}

/**
 * Builds a sphere mesh object.
 *
 * @param radius - Sphere radius in scene units. Defaults to `1`.
 * @param material - Surface material applied to the sphere.
 * @param transform - Initial position, rotation, and scale.
 * @returns A mesh object ready for the scene graph.
 */
export function sphere(radius = 1, material: MaterialSpec = {}, transform: Transform3D = {}): MeshObject {
  return { kind: 'mesh', geometry: { type: 'sphere', radius }, material, transform };
}

/**
 * Builds a cylinder mesh object.
 *
 * @param size - Radii and height; omitted dimensions fall back to three.js defaults.
 * @param material - Surface material applied to the cylinder.
 * @param transform - Initial position, rotation, and scale.
 * @returns A mesh object ready for the scene graph.
 */
export function cylinder(size: { radiusTop?: number; radiusBottom?: number; height?: number } = {}, material: MaterialSpec = {}, transform: Transform3D = {}): MeshObject {
  return { kind: 'mesh', geometry: { type: 'cylinder', ...size }, material, transform };
}

/**
 * Builds a cone mesh object.
 *
 * @param size - Base radius and height; omitted dimensions fall back to three.js defaults.
 * @param material - Surface material applied to the cone.
 * @param transform - Initial position, rotation, and scale.
 * @returns A mesh object ready for the scene graph.
 */
export function cone(size: { radius?: number; height?: number } = {}, material: MaterialSpec = {}, transform: Transform3D = {}): MeshObject {
  return { kind: 'mesh', geometry: { type: 'cone', ...size }, material, transform };
}

/**
 * Builds a torus mesh object.
 *
 * @param size - Ring and tube radii; omitted dimensions fall back to three.js defaults.
 * @param material - Surface material applied to the torus.
 * @param transform - Initial position, rotation, and scale.
 * @returns A mesh object ready for the scene graph.
 */
export function torus(size: { radius?: number; tube?: number } = {}, material: MaterialSpec = {}, transform: Transform3D = {}): MeshObject {
  return { kind: 'mesh', geometry: { type: 'torus', ...size }, material, transform };
}

/**
 * Builds a `z = f(u, v)` surface mesh object.
 *
 * The geometry keeps the sampling function, so it can never be serialized. Use
 * {@link sampleHeightfield} when the surface must travel in a document.
 *
 * @param fn - Height sampled for each pair of `u` and `v` in their ranges.
 * @param options - Grid resolution, ranges, and height-based colors.
 * @param material - Surface material; vertex colors are enabled by default.
 * @param transform - Initial position, rotation, and scale.
 * @returns A mesh object ready for the scene graph.
 */
export function surface(fn: (u: number, v: number) => number, options: SurfaceOptions = {}, material: MaterialSpec = {}, transform: Transform3D = {}): MeshObject {
  return { kind: 'mesh', geometry: { type: 'surface', fn, ...options }, material: { vertexColors: true, roughness: 0.5, ...material }, transform };
}

/**
 * Builds a surface mesh from sampled height data, so it can be serialized.
 *
 * @param data - Grid dimensions, ranges, and the flat array of heights.
 * @param material - Surface material; vertex colors are enabled by default.
 * @param transform - Initial position, rotation, and scale.
 * @returns A mesh object ready for the scene graph.
 */
export function surfaceFromHeightfield(data: HeightfieldData, material: MaterialSpec = {}, transform: Transform3D = {}): MeshObject {
  return { kind: 'mesh', geometry: { type: 'heightfield', ...data }, material: { vertexColors: true, roughness: 0.5, ...material }, transform };
}

/**
 * Serializable representation of a sampled surface.
 */
export interface HeightfieldData {
  uSegments: number;
  vSegments: number;
  uRange: [number, number];
  vRange: [number, number];
  heights: number[];
  colorLow?: string;
  colorHigh?: string;
}

/**
 * Samples a height function row by row and returns serializable data.
 *
 * Heights are stored in row-major order: `v` advances across rows, and `u`
 * advances within a row. The result can be written to JSON, a database, or a
 * message payload.
 *
 * @param fn - Height sampled for each pair of `u` and `v` in their ranges.
 * @param options - Grid resolution, ranges, and height-based colors.
 * @returns The sampled grid, ready for {@link surfaceFromHeightfield}.
 */
export function sampleHeightfield(fn: (u: number, v: number) => number, options: SurfaceOptions = {}): HeightfieldData {
  const uSegments = options.uSegments ?? 32;
  const vSegments = options.vSegments ?? 32;
  const uRange = options.uRange ?? [-3, 3];
  const vRange = options.vRange ?? [-3, 3];
  const heights: number[] = [];

  for (let j = 0; j <= vSegments; j += 1) {
    const v = vRange[0] + ((vRange[1] - vRange[0]) * j) / vSegments;
    for (let i = 0; i <= uSegments; i += 1) {
      const u = uRange[0] + ((uRange[1] - uRange[0]) * i) / uSegments;
      heights.push(fn(u, v));
    }
  }

  return { uSegments, vSegments, uRange, vRange, heights, colorLow: options.colorLow, colorHigh: options.colorHigh };
}

/**
 * Groups child objects under one transform so they move together.
 *
 * @param name - Name used to address the group through bindings.
 * @param children - Mesh, group, and light objects owned by this group.
 * @param transform - Transform applied to the group as a whole.
 * @returns A group object ready for the scene graph.
 */
export function group(name: string, children: SceneObject[], transform: Transform3D = {}): GroupObject {
  return { kind: 'group', name, children, transform };
}

/**
 * Builds an ambient light that illuminates every surface equally.
 *
 * @param color - Light color in CSS notation. Defaults to white.
 * @param intensity - Brightness multiplier. Defaults to `0.6`.
 * @returns A light object ready for the scene graph.
 */
export function ambientLight(color = '#ffffff', intensity = 0.6): LightObject {
  return { kind: 'light', type: 'ambient', color, intensity };
}

/**
 * Builds a directional light that casts parallel rays from one direction.
 *
 * @param position - Direction the light travels from, not a location in space.
 * @param intensity - Brightness multiplier. Defaults to `1.2`.
 * @returns A light object ready for the scene graph.
 */
export function directionalLight(position: Vector3Tuple = [5, 8, 5], intensity = 1.2): LightObject {
  return { kind: 'light', type: 'directional', position, intensity };
}

/**
 * Builds a point light that radiates in every direction from one location.
 *
 * @param position - Location of the light in scene units.
 * @param intensity - Brightness multiplier. Defaults to `1`.
 * @returns A light object ready for the scene graph.
 */
export function pointLight(position: Vector3Tuple = [0, 4, 0], intensity = 1): LightObject {
  return { kind: 'light', type: 'point', position, intensity };
}
