import type { LernoDocument, VariableDefinition, VariableValue } from '../content/schema';

/** Builds the initial values for the document variables. */
export function initialVariables(document: LernoDocument): Record<string, VariableValue> {
  const values: Record<string, VariableValue> = {};
  for (const [name, definition] of Object.entries(document.variables)) {
    values[name] = definition.initial;
  }
  return values;
}

/**
 * Checks a value against a variable definition.
 * @returns An error message, or null when valid.
 */
export function variableError(definition: VariableDefinition, value: VariableValue): string | null {
  if (typeof value !== definition.type) {
    return `"${definition.type}" bekleniyordu, "${typeof value}" geldi`;
  }
  if (definition.enum && !definition.enum.some((entry) => entry === value)) {
    return `Value outside the enum: ${String(value)}`;
  }
  return null;
}

/**
 * Fills saved session variables from the document definition.
 * Missing or stale values fall back to defaults; old saves stay valid.
 */
export function withVariableDefaults(
  document: LernoDocument,
  values: Record<string, VariableValue> | undefined,
): Record<string, VariableValue> {
  const merged = initialVariables(document);
  if (!values) return merged;

  for (const [name, definition] of Object.entries(document.variables)) {
    const stored = values[name];
    if (stored !== undefined && variableError(definition, stored) === null) merged[name] = stored;
  }
  return merged;
}
