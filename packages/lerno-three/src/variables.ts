import { DerivedProperty, Property } from '@medu/lerno';

/** Value types a {@link VariableStore} can hold. */
export type VariableValue = number | string | boolean;

/**
 * Named reactive variables shared by a scene and its bindings.
 *
 * The store is the single source of truth for every value a scene reads: a
 * binding, a derived value, and a snapshot all address variables by name. It
 * holds only serializable values, so a snapshot can be written to JSON.
 */
export class VariableStore {
  private readonly variables = new Map<string, Property<VariableValue>>();
  private readonly disposables: { dispose(): void }[] = [];

  /**
   * Defines a variable of any supported type.
   *
   * @param name - Unique variable name.
   * @param initial - Value the variable starts with.
   * @returns The live property bindings subscribe to.
   */
  define(name: string, initial: VariableValue): Property<VariableValue> {
    const existing = this.variables.get(name);
    if (existing) return existing;
    const property = new Property<VariableValue>(initial);
    this.variables.set(name, property);
    return property;
  }

  /**
   * Defines a numeric variable with a narrowed property type.
   *
   * `Property<T>` is invariant because it writes as well as reads, so crossing
   * the `VariableValue` boundary needs one assertion on each side. Both live in
   * this method; no other call site in the store casts.
   *
   * @param name - Unique variable name.
   * @param initial - Initial value.
   * @returns A `Property<number>` typed for arithmetic bindings.
   */
  defineNumber(name: string, initial: number): Property<number> {
    const existing = this.variables.get(name);
    if (existing) return existing as unknown as Property<number>;
    const property = new Property<number>(initial);
    this.variables.set(name, property as unknown as Property<VariableValue>);
    return property;
  }

  /**
   * Defines a variable recomputed whenever its dependencies change.
   *
   * @param name - Unique variable name for the derived value.
   * @param dependencies - Names of the variables this value reads.
   * @param derive - Function receiving the current dependency values in order.
   * @returns The live property holding the derived value.
   */
  derive(name: string, dependencies: string[], derive: (values: VariableValue[]) => VariableValue): Property<VariableValue> {
    const deps = dependencies.map((dependency) => this.define(dependency, 0));
    const property = new DerivedProperty(deps, (values) => derive(values));
    this.variables.set(name, property);
    this.disposables.push(property);
    return property;
  }

  /**
   * Looks up the property behind a variable.
   *
   * @param name - Variable name.
   * @returns The property, or `undefined` when the name is unknown.
   */
  get(name: string): Property<VariableValue> | undefined {
    return this.variables.get(name);
  }

  /**
   * Reads the current value of a variable.
   *
   * @param name - Variable name.
   * @returns The value, or `undefined` when the name is unknown.
   */
  value(name: string): VariableValue | undefined {
    return this.variables.get(name)?.get();
  }

  /**
   * Reads a variable as a number.
   *
   * @param name - Variable name.
   * @returns The numeric value, or `undefined` when the variable is absent or
   * not numeric.
   */
  number(name: string): number | undefined {
    const value = this.value(name);
    return typeof value === 'number' ? value : undefined;
  }

  /**
   * Writes a value into an existing variable.
   *
   * Unknown names are ignored so a stale binding cannot corrupt the store.
   *
   * @param name - Variable name.
   * @param value - New value.
   */
  set(name: string, value: VariableValue): void {
    this.define(name, value).set(value);
  }

  /**
   * Checks whether a variable exists.
   *
   * @param name - Variable name.
   * @returns `true` when the name is defined.
   */
  has(name: string): boolean {
    return this.variables.has(name);
  }

  /**
   * Lists every defined variable name.
   *
   * @returns Names in insertion order.
   */
  names(): string[] {
    return [...this.variables.keys()];
  }

  /**
   * Captures every variable as plain data.
   *
   * Derived values are included, so a restore re-establishes the same state
   * without replaying the edits that produced it.
   *
   * @returns A JSON-serializable record of name to value.
   */
  snapshot(): Record<string, VariableValue> {
    return Object.fromEntries([...this.variables.entries()].map(([name, property]) => [name, property.get()]));
  }

  /**
   * Writes a snapshot back into the store.
   *
   * Values for unknown names are ignored, so a snapshot from a newer document
   * cannot throw in an older one.
   *
   * @param snapshot - Record previously produced by {@link snapshot}.
   */
  restore(snapshot: Record<string, VariableValue>): void {
    for (const [name, value] of Object.entries(snapshot)) this.set(name, value);
  }

  /**
   * Releases every property and derived listener held by the store.
   */
  dispose(): void {
    for (const disposable of this.disposables) disposable.dispose();
    for (const property of this.variables.values()) property.dispose();
    this.variables.clear();
    this.disposables.length = 0;
  }
}
