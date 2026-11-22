import { defineDocument } from '../content/document';
import { initialVariables, variableError, withVariableDefaults } from './variables';

const document = defineDocument({
  id: 'variables',
  type: 'lesson',
  metadata: { title: 'Variables' },
  variables: {
    airOn: { type: 'boolean', initial: false },
    g: { type: 'number', initial: 10, enum: [9.8, 10] },
    label: { type: 'string', initial: 'serbest' },
  },
  nodes: [{ id: 's', type: 'slide', blocks: [] }],
});

describe('variables', () => {
  it('builds initial values from the document', () => {
    expect(initialVariables(document)).toEqual({ airOn: false, g: 10, label: 'serbest' });
  });

  it('validates type and enum', () => {
    expect(variableError(document.variables.g, 9.8)).toBeNull();
    expect(variableError(document.variables.g, 5)).toBe('Value outside the enum: 5');
    expect(variableError(document.variables.airOn, 'evet' as unknown as boolean)).toBe(
      '"boolean" bekleniyordu, "string" geldi',
    );
  });

  it('fills saved values and resets corrupt ones', () => {
    expect(withVariableDefaults(document, { airOn: true, g: 9.8 })).toEqual({
      airOn: true,
      g: 9.8,
      label: 'serbest',
    });
    expect(withVariableDefaults(document, { g: 5, label: 'x', stale: true })).toEqual({
      airOn: false,
      g: 10,
      label: 'x',
    });
  });
});
