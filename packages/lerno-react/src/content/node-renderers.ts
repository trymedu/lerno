import type { ComponentType } from 'react';
import type { CustomNode, LessonStage, VariableValue } from '@medu/lerno';

/** Props accepted by `CustomNodeRenderer`. */
export interface CustomNodeRendererProps {
  node: CustomNode;
  variables: Record<string, VariableValue>;
  setVariable: (variable: string, value: VariableValue) => void;
  /** Single lesson stage for time, session, and layers. */
  stage: LessonStage;
}

/**
 * Custom node renderers.
 * Keyed by `extension:kind` (or `kind`); applications register their node types here.
 */
export type CustomNodeRendererMap = Record<string, ComponentType<CustomNodeRendererProps>>;

/** Lookup key for a custom node. */
export function customNodeKey(node: Pick<CustomNode, 'extension' | 'kind'>): string {
  return `${node.extension}:${node.kind}`;
}
