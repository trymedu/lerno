'use client';

import { useEffect, useRef, type CSSProperties } from 'react';
import { ThreeRuntime } from './runtime.js';
import type { Scene3DSpec } from './scene.js';
import type { VariableStore } from './variables.js';

/** Props accepted by `ThreeCanvas`. */
export interface ThreeCanvasProps {
  spec: Scene3DSpec;
  store?: VariableStore;
  className?: string;
  style?: CSSProperties;
  /** Auto-rotation speed around the Y axis, in radians per second. */
  autoRotateSpeed?: number;
  onReady?: (runtime: ThreeRuntime) => void;
}

/**
 * React component that binds a Three.js scene to a container element.
 * Variables and animations run through a ThreeRuntime owned by the component.
 */
export function ThreeCanvas({ spec, store, className, style, autoRotateSpeed = 0, onReady }: ThreeCanvasProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return undefined;

    const runtime = new ThreeRuntime(spec, { store });
    runtime.mount(container);
    onReady?.(runtime);

    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      if (autoRotateSpeed !== 0) {
        for (const object of runtime.scene.children) object.rotation.y += autoRotateSpeed * dt;
      }
      runtime.step(dt);
      runtime.render();
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    const onResize = () => runtime.resize();
    window.addEventListener('resize', onResize);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', onResize);
      runtime.dispose();
    };
  }, [spec, store, autoRotateSpeed, onReady]);

  return <div ref={containerRef} className={className} style={{ width: '100%', height: 360, ...style }} />;
}
