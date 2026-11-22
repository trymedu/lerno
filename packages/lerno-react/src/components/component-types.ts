import type { ComponentType } from 'react';
import type { VariableValue } from '@medu/lerno';

/** `LayerTone` type. */
export type LayerTone = 'light' | 'dark';

/**
 * Common contract every video layer component receives.
 * `value` / `onChange` only bind on layers with `bind.value`.
 */
export interface LernoComponentProps {
  value?: VariableValue;
  onChange?: (value: VariableValue) => void;
  tone?: LayerTone;
  [key: string]: unknown;
}

/** `LernoComponentMap` type. */
export type LernoComponentMap = Record<string, ComponentType<LernoComponentProps>>;

/** Reads a string prop, falling back when the value is not a string. */
export function asString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

/** Reads a numeric prop, falling back when the value is not a finite number. */
export function asNumber(value: unknown, fallback = 0): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

/** Reads a boolean prop; anything other than `true` is false. */
export function asBoolean(value: unknown): boolean {
  return value === true;
}
