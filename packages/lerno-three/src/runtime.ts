import * as THREE from 'three';
import { AnimationTimeline, animateNumber, type TweenOptions } from '@medu/lerno';
import { springNumber, type SpringOptions } from '@medu/lerno-motion';
import type { GeometrySpec, HeightfieldData, MaterialSpec, Scene3DSpec, SceneObject, SurfaceOptions, Transform3D, TransformChannel } from './scene.js';
import { VariableStore } from './variables.js';

/**
 * Creates a three.js geometry from a declarative specification.
 *
 * The spec is plain data, so it can live in a document; the returned geometry
 * is a runtime object owned by the caller.
 *
 * @param spec - Discriminated union describing the primitive or sampled surface.
 * @returns The built geometry buffer.
 * @throws RangeError If a surface or heightfield carries an empty grid.
 */
export function createGeometry(spec: GeometrySpec): THREE.BufferGeometry {
  switch (spec.type) {
    case 'box':
      return new THREE.BoxGeometry(spec.width ?? 1, spec.height ?? 1, spec.depth ?? 1);
    case 'sphere':
      return new THREE.SphereGeometry(spec.radius ?? 1, spec.widthSegments ?? 32, spec.heightSegments ?? 16);
    case 'cylinder':
      return new THREE.CylinderGeometry(spec.radiusTop ?? 1, spec.radiusBottom ?? 1, spec.height ?? 2, spec.radialSegments ?? 32);
    case 'cone':
      return new THREE.ConeGeometry(spec.radius ?? 1, spec.height ?? 2, spec.radialSegments ?? 32);
    case 'torus':
      return new THREE.TorusGeometry(spec.radius ?? 1, spec.tube ?? 0.4, spec.radialSegments ?? 16, spec.tubularSegments ?? 64);
    case 'plane':
      return new THREE.PlaneGeometry(spec.width ?? 1, spec.height ?? 1);
    case 'surface':
      return createSurfaceGeometry(spec.fn, spec);
    case 'heightfield':
      return createHeightfieldGeometry(spec);
    default:
      return new THREE.BoxGeometry(1, 1, 1);
  }
}

/**
 * Samples `z = f(u, v)` on a grid and builds a colored triangle mesh.
 *
 * Vertex colors come from height, so the ramp is baked into the buffer and no
 * shader is required. Falls back to the function geometry when `fn` is absent.
 *
 * @param spec - Surface spec holding the sampling function or sampled data.
 * @returns The built geometry buffer with a `color` attribute.
 */
function buildSurfaceGeometry(
  heights: number[],
  uSegments: number,
  vSegments: number,
  uRange: [number, number],
  vRange: [number, number],
  colorLow = '#3b82f6',
  colorHigh = '#f59e0b',
): THREE.BufferGeometry {
  const cols = uSegments + 1;
  const positions: number[] = [];
  const colors: number[] = [];
  const indices: number[] = [];

  let minHeight = Number.POSITIVE_INFINITY;
  let maxHeight = Number.NEGATIVE_INFINITY;
  for (const height of heights) {
    if (height < minHeight) minHeight = height;
    if (height > maxHeight) maxHeight = height;
  }
  const span = maxHeight - minHeight || 1;
  const low = new THREE.Color(colorLow);
  const high = new THREE.Color(colorHigh);

  for (let j = 0; j <= vSegments; j += 1) {
    const v = vRange[0] + ((vRange[1] - vRange[0]) * j) / vSegments;
    for (let i = 0; i <= uSegments; i += 1) {
      const u = uRange[0] + ((uRange[1] - uRange[0]) * i) / uSegments;
      const height = heights[j * cols + i] ?? 0;
      positions.push(u, height, v);
      const ratio = (height - minHeight) / span;
      const color = low.clone().lerp(high, ratio);
      colors.push(color.r, color.g, color.b);
    }
  }

  for (let j = 0; j < vSegments; j += 1) {
    for (let i = 0; i < uSegments; i += 1) {
      const a = j * cols + i;
      const b = a + 1;
      const c = a + cols;
      const d = c + 1;
      // Winding order for an upward normal: (a, d, b) and (a, c, d)
      indices.push(a, d, b, a, c, d);
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setIndex(indices);
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geometry.computeVertexNormals();
  return geometry;
}

/**
 * Builds a colored surface geometry from a height function.
 *
 * @param fn - Height sampled for each pair of `u` and `v`.
 * @param options - Grid resolution, ranges, and height-based colors.
 * @returns The geometry buffer carrying positions and vertex colors.
 */
export function createSurfaceGeometry(fn: (u: number, v: number) => number, options: SurfaceOptions = {}): THREE.BufferGeometry {
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

  return buildSurfaceGeometry(heights, uSegments, vSegments, uRange, vRange, options.colorLow, options.colorHigh);
}

/**
 * Builds a colored surface geometry from previously sampled height data.
 *
 * This is the serializable counterpart of {@link createSurfaceGeometry}: the
 * data travels in a document, and only this step runs on the client.
 *
 * @param data - Grid dimensions, ranges, and the flat array of heights.
 * @returns The geometry buffer carrying positions and vertex colors.
 */
export function createHeightfieldGeometry(data: HeightfieldData): THREE.BufferGeometry {
  return buildSurfaceGeometry(data.heights, data.uSegments, data.vSegments, data.uRange, data.vRange, data.colorLow, data.colorHigh);
}

/**
 * Creates a standard material from a declarative specification.
 *
 * @param spec - Color, roughness, metalness, and vertex-color flags.
 * @returns A `MeshStandardMaterial` ready for a mesh.
 */
export function createMaterial(spec: MaterialSpec = {}): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color: spec.color ?? '#42a5f5',
    emissive: spec.emissive ?? '#000000',
    metalness: spec.metalness ?? 0.25,
    roughness: spec.roughness ?? 0.4,
    opacity: spec.opacity ?? 1,
    transparent: spec.transparent ?? (spec.opacity !== undefined && spec.opacity < 1),
    wireframe: spec.wireframe ?? false,
    vertexColors: spec.vertexColors ?? false,
  });
}

/**
 * Applies position, rotation, and scale to an object in place.
 *
 * Rotation values are in radians and are set per axis, so a transform never
 * accumulates across updates.
 *
 * @param object - Scene object to mutate.
 * @param transform - Transform fields to apply; absent fields are left untouched.
 */
function applyTransform(object: THREE.Object3D, transform: Transform3D | undefined): void {
  if (!transform) return;
  if (transform.position) object.position.set(...transform.position);
  if (transform.rotation) object.rotation.set(...transform.rotation);
  if (transform.scale) object.scale.set(...transform.scale);
}

/**
 * Turns one scene object into a live three.js object.
 *
 * Mesh and group objects are registered in `registry` so bindings can address
 * them later. The registry maps live objects back to their declarations, which
 * keeps bindings stable across rebuilds.
 *
 * @param spec - Declarative object to build.
 * @param registry - Map filled with every object this call creates.
 * @returns The live three.js object.
 */
export function buildObject(spec: SceneObject, registry: Map<THREE.Object3D, SceneObject>): THREE.Object3D {
  if (spec.kind === 'light') {
    const color = spec.color ?? '#ffffff';
    const intensity = spec.intensity ?? 1;
    const light =
      spec.type === 'ambient'
        ? new THREE.AmbientLight(color, intensity)
        : spec.type === 'point'
          ? new THREE.PointLight(color, intensity)
          : new THREE.DirectionalLight(color, intensity);
    if (spec.position) light.position.set(...spec.position);
    if (spec.name) light.name = spec.name;
    registry.set(light, spec);
    return light;
  }

  if (spec.kind === 'group') {
    const node = new THREE.Group();
    if (spec.name) node.name = spec.name;
    applyTransform(node, spec.transform);
    registry.set(node, spec);
    for (const child of spec.children) node.add(buildObject(child, registry));
    return node;
  }

  const geometry = createGeometry(spec.geometry);
  const material = createMaterial(spec.material);
  if (geometry.getAttribute('color')) material.vertexColors = true;
  const mesh = new THREE.Mesh(geometry, material);
  if (spec.name) mesh.name = spec.name;
  applyTransform(mesh, spec.transform);
  registry.set(mesh, spec);
  return mesh;
}

/**
 * Reads the standard material of a mesh, when the object carries one.
 *
 * @param object - Object to inspect.
 * @returns The material, or `undefined` for non-mesh objects.
 */
function meshMaterial(object: THREE.Object3D): THREE.MeshStandardMaterial | undefined {
  if (object instanceof THREE.Mesh && object.material instanceof THREE.MeshStandardMaterial) return object.material;
  return undefined;
}

/**
 * Writes one numeric value into a transform channel of an object.
 *
 * Unsupported channels are ignored rather than thrown, so a scene written for
 * one runtime keeps working where a channel is not representable.
 *
 * @param object - Object whose channel is updated.
 * @param channel - Transform channel to write.
 * @param value - Numeric value in the channel's own unit.
 */
export function applyChannel(object: THREE.Object3D, channel: TransformChannel, value: number): void {
  switch (channel) {
    case 'position.x':
      object.position.x = value;
      break;
    case 'position.y':
      object.position.y = value;
      break;
    case 'position.z':
      object.position.z = value;
      break;
    case 'rotation.x':
      object.rotation.x = value;
      break;
    case 'rotation.y':
      object.rotation.y = value;
      break;
    case 'rotation.z':
      object.rotation.z = value;
      break;
    case 'scale.x':
      object.scale.x = value;
      break;
    case 'scale.y':
      object.scale.y = value;
      break;
    case 'scale.z':
      object.scale.z = value;
      break;
    case 'material.opacity': {
      const material = meshMaterial(object);
      if (material) {
        material.opacity = value;
        material.transparent = value < 1;
      }
      break;
    }
    case 'material.metalness': {
      const material = meshMaterial(object);
      if (material) material.metalness = value;
      break;
    }
    default:
      break;
  }
}

/**
 * Reads every bound variable and applies it to an object's transform channels.
 *
 * Called once per frame; a channel with no variable keeps its declarative
 * value.
 *
 * @param object - Object whose channels are updated.
 * @param spec - Object declaration holding the `bindings` map.
 * @param store - Variable store the bindings read from.
 */
export function applyBindings(object: THREE.Object3D, spec: SceneObject, store: VariableStore): void {
  if (spec.kind === 'light') return;
  const bindings = spec.transform?.bindings;
  if (!bindings) return;
  for (const [channel, variable] of Object.entries(bindings) as [TransformChannel, string][]) {
    const value = store.number(variable);
    if (value !== undefined) applyChannel(object, channel, value);
  }
}

/**
 * Raised when the runtime is asked to draw without a browser.
 *
 * `ThreeRuntime` uses `WebGLRenderer`, which needs a DOM canvas. Three.js
 * scenes therefore cannot be recorded by `@medu/lerno-export`; 3D frames have
 * to be rendered by a browser or a WebGL backend and composited as video.
 */
export const THREE_HEADLESS_ERROR =
  'ThreeRuntime renders with WebGL in a browser and cannot render headlessly. @medu/lerno-export records Lerno 2D node trees; render the 3D layer in a browser or a WebGL backend and composite it through exportMp4({ video }).';

/** Construction options for {@link ThreeRuntime}. */
export interface ThreeRuntimeOptions {
  store?: VariableStore;
  background?: string;
}

/**
 * Three.js runtime that builds the declarative scene and applies variable bindings
 * and animations on every frame. It does not depend on React.
 */
export class ThreeRuntime {
  readonly scene = new THREE.Scene();
  readonly camera: THREE.PerspectiveCamera;
  readonly store: VariableStore;
  private readonly spec: Scene3DSpec;
  private readonly registry = new Map<THREE.Object3D, SceneObject>();
  private readonly timeline = new AnimationTimeline();
  private renderer?: THREE.WebGLRenderer;
  private container?: HTMLElement;

  /**
   * Creates a runtime from a declarative scene.
   * @param spec - Camera, objects, and lighting described as plain data.
   * @param options - Renderer sizing and pixel-ratio choices.
   */
  constructor(spec: Scene3DSpec, options: ThreeRuntimeOptions = {}) {
    this.spec = spec;
    this.store = options.store ?? new VariableStore();

    const camera = spec.camera ?? {};
    this.camera = new THREE.PerspectiveCamera(camera.fov ?? 50, 16 / 9, 0.1, 1000);
    const [cx, cy, cz] = camera.position ?? [4, 4, 6];
    this.camera.position.set(cx, cy, cz);
    const [lx, ly, lz] = camera.lookAt ?? [0, 0, 0];
    this.camera.lookAt(lx, ly, lz);

    const background = options.background ?? spec.background;
    if (background) this.scene.background = new THREE.Color(background);

    for (const object of spec.objects) this.scene.add(buildObject(object, this.registry));
  }

  /**
   * Attaches the renderer canvas to a container element.
   * The renderer owns nothing else in the container; dispose removes only its own canvas.
   * @param container - DOM node that receives the canvas.
   * @throws Error When no DOM or WebGL is available; see {@link THREE_HEADLESS_ERROR}.
   */
  mount(container: HTMLElement): void {
    if (typeof document === 'undefined' || typeof container?.appendChild !== 'function') {
      throw new Error(THREE_HEADLESS_ERROR);
    }
    this.container = container;
    try {
      this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: !this.scene.background });
    } catch (error) {
      throw new Error(THREE_HEADLESS_ERROR, { cause: error });
    }
    this.renderer.setPixelRatio(Math.min(2, globalThis.devicePixelRatio ?? 1));
    container.appendChild(this.renderer.domElement);
    this.resize();
  }

  /**
   * Resynchronizes the drawing buffer with the current canvas size.
   * Call after a layout change; step does this automatically when sizes drift.
   */
  resize(): void {
    if (!this.renderer || !this.container) return;
    const width = this.container.clientWidth || 640;
    const height = this.container.clientHeight || 360;
    this.renderer.setSize(width, height, false);
    this.renderer.domElement.style.width = '100%';
    this.renderer.domElement.style.height = '100%';
    this.renderer.domElement.style.display = 'block';
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  }

  /**
   * Advances animations, applies variable bindings, and draws one frame.
   * @param dtSeconds - Elapsed time in seconds.
   */
  step(dtSeconds: number): void {
    this.timeline.step(dtSeconds);
    for (const [object, spec] of this.registry) applyBindings(object, spec, this.store);
  }

  /**
   * Draws one frame without advancing animations.
   * Used after an external change to a variable or the scene.
   * @throws Error When the runtime is not mounted; 3D drawing needs WebGL.
   */
  render(): void {
    if (!this.renderer) {
      throw new Error(
        'ThreeRuntime.render() has no WebGL renderer. Call mount(container) in a browser; 3D rendering is not available headlessly.',
      );
    }
    this.renderer.render(this.scene, this.camera);
  }

  /**
   * Animates a numeric variable toward a target value.
   * The scene reacts through bindings, so no object reference is needed.
   * @param name - Variable to animate; unknown names are ignored.
   * @param to - Target value.
   * @param options - Tween timing or spring stiffness, damping, and mass.
   */
  animate(name: string, to: number, options: (TweenOptions & { spring?: boolean }) | SpringOptions = {}): void {
    const property = this.store.defineNumber(name, to);
    const isSpring = (options as { spring?: boolean }).spring ?? false;
    const animation = isSpring
      ? springNumber(property, to, options as SpringOptions)
      : animateNumber(property, to, options as TweenOptions);
    this.timeline.add(animation);
  }

  /**
   * Looks up a live object by its scene name.
   * @param name - Name assigned by the object declaration.
   * @returns The live object, or undefined when nothing matches.
   */
  find(name: string): THREE.Object3D | undefined {
    return this.scene.getObjectByName(name);
  }

  /**
   * The declarative object list this runtime renders, for inspection and snapshotting.
   */
  get specObjects(): Scene3DSpec['objects'] {
    return this.spec.objects;
  }

  /**
   * Releases the renderer, the animation loop, and every object this runtime owns.
   */
  dispose(): void {
    this.renderer?.dispose();
    this.renderer?.domElement.remove();
    this.renderer = undefined;
    this.container = undefined;
  }
}
