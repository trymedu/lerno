import { describe, expect, it } from 'bun:test';
import * as THREE from 'three';
import { THREE_HEADLESS_ERROR, ThreeRuntime, applyBindings, applyChannel, buildObject, createGeometry, createHeightfieldGeometry, createMaterial, createSurfaceGeometry } from './runtime';
import { box, sampleHeightfield, sphere, surface, surfaceFromHeightfield, type SceneObject } from './scene';
import { VariableStore } from './variables';

describe('geometry and material', () => {
  it('geometry kinds', () => {
    expect(createGeometry({ type: 'box' })).toBeInstanceOf(THREE.BoxGeometry);
    expect(createGeometry({ type: 'sphere' })).toBeInstanceOf(THREE.SphereGeometry);
    expect(createGeometry({ type: 'cylinder' })).toBeInstanceOf(THREE.CylinderGeometry);
    expect(createGeometry({ type: 'torus' })).toBeInstanceOf(THREE.TorusGeometry);
  });

  it('material', () => {
    const material = createMaterial({ color: '#ff0000', opacity: 0.5 });
    expect(material.color.getHexString()).toBe('ff0000');
    expect(material.transparent).toBe(true);
  });
});

describe('surface geometry', () => {
  it('produces vertices and colors from a function', () => {
    const geometry = createSurfaceGeometry((u, v) => u * u + v * v, { uSegments: 4, vSegments: 4, uRange: [-1, 1], vRange: [-1, 1] });
    const position = geometry.getAttribute('position');
    const color = geometry.getAttribute('color');
    expect(position.count).toBe(5 * 5);
    expect(color.count).toBe(5 * 5);
    expect(geometry.getIndex()?.count).toBe(4 * 4 * 6);
    // corner (-1, -1) -> 2, center (0, 0) -> 0
    expect(position.getY(0)).toBeCloseTo(2, 6);
    expect(position.getY(2 * 5 + 2)).toBeCloseTo(0, 6);
  });

  it('builds a serializable surface from a heightfield', () => {
    const data = sampleHeightfield((u, v) => Math.sin(u) * Math.cos(v), { uSegments: 8, vSegments: 8, uRange: [0, 3], vRange: [0, 3] });
    expect(data.heights).toHaveLength(9 * 9);
    const geometry = createHeightfieldGeometry(data);
    expect(geometry.getAttribute('position').count).toBe(9 * 9);
  });

  it('the surface builder enables vertexColors', () => {
    const mesh = surface((u, v) => u * v, { uSegments: 4, vSegments: 4 });
    const built = buildObject(mesh, new Map<THREE.Object3D, SceneObject>());
    expect(built).toBeInstanceOf(THREE.Mesh);
    if (built instanceof THREE.Mesh && built.material instanceof THREE.MeshStandardMaterial) {
      expect(built.material.vertexColors).toBe(true);
    }
  });

  it('surfaceFromHeightfield uses the height data', () => {
    const data = sampleHeightfield((u, v) => u + v, { uSegments: 2, vSegments: 2, uRange: [0, 1], vRange: [0, 1] });
    const mesh = surfaceFromHeightfield(data);
    if (mesh.geometry.type !== 'heightfield') throw new Error('beklenen heightfield');
    expect(mesh.geometry.heights).toEqual(data.heights);
  });
});

describe('buildObject', () => {
  it('builds the mesh and group tree', () => {
    const registry = new Map<THREE.Object3D, SceneObject>();
    const object = buildObject(box({ width: 2 }, {}, { position: [1, 2, 3], bindings: { 'position.x': 'x' } }), registry);
    expect(object).toBeInstanceOf(THREE.Mesh);
    expect(object.position.toArray()).toEqual([1, 2, 3]);
    expect(registry.get(object)).toBeDefined();
  });
});

describe('applyBindings', () => {
  it('applies variable values to position', () => {
    const store = new VariableStore();
    store.define('x', 2);
    store.define('y', 4);
    const spec = sphere(1, {}, { bindings: { 'position.x': 'x', 'position.y': 'y' } });
    const registry = new Map<THREE.Object3D, SceneObject>();
    const object = buildObject(spec, registry);

    applyBindings(object, spec, store);
    expect(object.position.x).toBe(2);
    expect(object.position.y).toBe(4);

    store.set('x', 7);
    applyBindings(object, spec, store);
    expect(object.position.x).toBe(7);
  });

  it('applies material channels', () => {
    const mesh = new THREE.Mesh(createGeometry({ type: 'box' }), createMaterial());
    applyChannel(mesh, 'material.opacity', 0.3);
    applyChannel(mesh, 'material.metalness', 0.9);
    if (!(mesh.material instanceof THREE.MeshStandardMaterial)) throw new Error('beklenen material');
    expect(mesh.material.opacity).toBeCloseTo(0.3, 6);
    expect(mesh.material.transparent).toBe(true);
    expect(mesh.material.metalness).toBeCloseTo(0.9, 6);
  });
});


describe('headless guard', () => {
  const spec = { camera: {}, objects: [] };

  it('rejects mounting without a DOM container', () => {
    const runtime = new ThreeRuntime(spec);
    expect(() => runtime.mount({} as HTMLElement)).toThrow(THREE_HEADLESS_ERROR);
  });

  it('rejects rendering before mount', () => {
    const runtime = new ThreeRuntime(spec);
    expect(() => runtime.render()).toThrow('no WebGL renderer');
  });
});
